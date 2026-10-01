"""Indexing service — traverse a GitHub repo, chunk files, embed, store in Qdrant."""

from __future__ import annotations

import asyncio
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
    access_token: str, owner: str, repo_name: str, branch: str = "HEAD"
) -> list[str]:
    """List all indexable file paths using the Git Trees API (single API call)."""
    try:
        tree = await github_service.get_repo_tree(access_token, owner, repo_name, branch)
        return [item["path"] for item in tree if _should_index(item.get("path", ""))]
    except Exception as exc:
        logger.warning("Error fetching tree for %s/%s: %s", owner, repo_name, exc)
        return []

# Mutable counter to pass chunk count back from _process_single_file
_last_chunk_count = 0


async def _process_single_file(
    access_token: str, owner: str, repo_name: str, fp: str, repo_id: str,
) -> None:
    """Download, chunk, embed, and upsert a single file."""
    global _last_chunk_count
    _last_chunk_count = 0

    content = await github_service.get_file_content(access_token, owner, repo_name, fp)
    if not content or not content.strip():
        return

    if len(content) > 100000:
        logger.warning("Skipping %s because it is too large (>100KB)", fp)
        return

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
    _last_chunk_count = len(chunks)


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
                    await asyncio.wait_for(
                        _process_single_file(
                            access_token, repo.owner, repo.name, fp,
                            repo_id,
                        ),
                        timeout=60,
                    )
                    files_processed += 1
                    total_chunks += _last_chunk_count

                    # Update progress after every file
                    repo.files_processed = files_processed
                    repo.chunk_count = total_chunks
                    await db.commit()

                except asyncio.TimeoutError:
                    logger.warning("Timeout processing file %s — skipping", fp)
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
