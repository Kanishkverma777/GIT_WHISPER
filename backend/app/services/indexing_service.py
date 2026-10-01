"""Indexing service — traverse a GitHub repo, chunk files, embed, store in Qdrant."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models.repository import Repository
from app.services import github_service, vector_service

logger = logging.getLogger(__name__)

# Extensions considered indexable vs. ignored
_ALLOWED_EXTENSIONS = {
    ".js", ".ts", ".jsx", ".tsx", ".py", ".java", ".cs", ".cpp", ".c",
    ".h", ".hpp", ".go", ".rs", ".rb", ".php", ".swift", ".kt",
    ".md", ".txt", ".json", ".yaml", ".yml", ".xml",
    ".html", ".css", ".scss", ".sass", ".less", ".sql",
}
_IGNORED_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff", ".ico", ".svg",
    ".pdf", ".zip", ".tar", ".gz", ".exe", ".dll", ".so", ".bin",
    ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".mp3", ".wav",
    ".lock", ".map",
}


def _should_index(file_path: str) -> bool:
    if "package-lock.json" in file_path.lower() or "yarn.lock" in file_path.lower():
        return False
    dot = file_path.rfind(".")
    if dot == -1:
        return False
    ext = file_path[dot:].lower()
    if ext in _IGNORED_EXTENSIONS:
        return False
    return ext in _ALLOWED_EXTENSIONS


# ── Chunking ──────────────────────────────────────────────────────────────────

_LANGUAGE_MAP = {
    ".js": "javascript", ".ts": "typescript", ".jsx": "javascript",
    ".tsx": "typescript", ".py": "python", ".java": "java",
    ".cs": "csharp", ".cpp": "cpp", ".c": "c", ".h": "c", ".hpp": "cpp",
    ".go": "go", ".rs": "rust", ".rb": "ruby", ".php": "php",
    ".swift": "swift", ".kt": "kotlin",
    ".md": "markdown", ".txt": "plaintext", ".json": "json",
    ".yaml": "yaml", ".yml": "yaml", ".xml": "xml",
    ".html": "html", ".css": "css", ".scss": "scss",
    ".sass": "sass", ".less": "less", ".sql": "sql",
}


def _detect_language(file_path: str) -> str:
    dot = file_path.rfind(".")
    if dot == -1:
        return "plaintext"
    return _LANGUAGE_MAP.get(file_path[dot:].lower(), "plaintext")


def chunk_code(
    content: str,
    file_path: str,
    chunk_size: int = 1000,
    overlap: int = 200,
) -> list[dict]:
    """Split source code into overlapping chunks."""
    lines = content.split("\n")
    language = _detect_language(file_path)
    chunks: list[dict] = []

    current_chunk = ""
    current_start = 0
    current_line = 0

    for i, line in enumerate(lines):
        line_with_nl = line + "\n"

        if len(current_chunk) + len(line_with_nl) > chunk_size and current_chunk:
            chunks.append({
                "file_path": file_path,
                "content": current_chunk.strip(),
                "start_line": current_start + 1,
                "end_line": current_line,
                "language": language,
            })
            overlap_start = max(0, len(current_chunk) - overlap)
            current_chunk = current_chunk[overlap_start:]
            overlap_lines = current_chunk.count("\n")
            current_start = max(0, current_line - overlap_lines)

        current_chunk += line_with_nl
        current_line = i + 1

    if current_chunk.strip():
        chunks.append({
            "file_path": file_path,
            "content": current_chunk.strip(),
            "start_line": current_start + 1,
            "end_line": current_line,
            "language": language,
        })

    return chunks


# ── Repo traversal & indexing ─────────────────────────────────────────────────


async def _traverse_repo(
    access_token: str, owner: str, repo_name: str, path: str = ""
) -> list[str]:
    """Recursively list all indexable file paths in a repository."""
    file_paths: list[str] = []
    try:
        contents = await github_service.get_repo_contents(access_token, owner, repo_name, path)
        for item in contents:
            if item.get("type") == "dir":
                child_paths = await _traverse_repo(access_token, owner, repo_name, item["path"])
                file_paths.extend(child_paths)
            elif item.get("type") == "file" and _should_index(item.get("name", "")):
                file_paths.append(item["path"])
    except Exception as exc:
        logger.warning("Error traversing %s/%s at %s: %s", owner, repo_name, path, exc)
    return file_paths


async def index_repository(repo_id: str, access_token: str) -> None:
    """
    Full indexing pipeline — called as a background task.

    Creates its own DB session so it's independent of the request lifecycle.
    """
    async with async_session_factory() as db:
        repo = await db.get(Repository, repo_id)
        if repo is None:
            logger.error("Repository %s not found for indexing", repo_id)
            return

        try:
            # Mark as INDEXING
            repo.index_status = "INDEXING"
            repo.error_message = None
            await db.commit()

            # Delete old vectors for this repo (supports re-indexing)
            await vector_service.delete_by_repository(repo_id)

            # Traverse the repo tree
            file_paths = await _traverse_repo(access_token, repo.owner, repo.name)
            repo.files_total = len(file_paths)
            await db.commit()

            files_processed = 0
            total_chunks = 0

            for fp in file_paths:
                try:
                    content = await github_service.get_file_content(
                        access_token, repo.owner, repo.name, fp
                    )
                    if not content or not content.strip():
                        continue
                        
                    if len(content) > 100000:
                        logger.warning("Skipping %s because it is too large (>100KB)", fp)
                        continue

                    chunks = chunk_code(content, fp)
                    chunk_texts = [c["content"] for c in chunks]
                    embeddings = await vector_service.get_embeddings_batch(chunk_texts)

                    batch: list[tuple[list[float], dict]] = []
                    for chunk, embedding in zip(chunks, embeddings):
                        payload = {
                            "repository_id": repo_id,
                            "file_path": chunk["file_path"],
                            "content": chunk["content"],
                            "start_line": chunk["start_line"],
                            "end_line": chunk["end_line"],
                            "language": chunk["language"],
                        }
                        batch.append((embedding, payload))

                    await vector_service.upsert_points_batch(batch)
                    total_chunks += len(chunks)
                    files_processed += 1

                    # Periodic progress update
                    if files_processed % 10 == 0:
                        repo.files_processed = files_processed
                        repo.chunk_count = total_chunks
                        await db.commit()

                except Exception as exc:
                    logger.warning("Error processing file %s: %s", fp, exc)

            # Mark as READY
            repo.index_status = "READY"
            repo.indexed_at = datetime.now(timezone.utc)
            repo.files_processed = files_processed
            repo.chunk_count = total_chunks
            await db.commit()

            logger.info(
                "Indexed %s — %d files, %d chunks",
                repo.full_name, files_processed, total_chunks,
            )

        except Exception as exc:
            logger.exception("Indexing failed for %s: %s", repo_id, exc)
            repo.index_status = "FAILED"
            repo.error_message = str(exc)
            await db.commit()
