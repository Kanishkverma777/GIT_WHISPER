"""Repos router — list, detail, sync from GitHub, indexing."""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.repository import Repository
from app.models.user import User
from app.schemas import IndexStatusResponse, RepositoryResponse
from app.services import github_service, indexing_service

router = APIRouter()
logger = logging.getLogger(__name__)


# ── GET /api/repos ────────────────────────────────────────────────────────────

@router.get("")
async def list_repos(
    refresh: bool = Query(False),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List repositories for the current user.

    If ``refresh=true``, sync from GitHub first (upsert new repos, update
    existing ones).  Otherwise return what's in the database.
    """
    if refresh and user.github_access_token:
        try:
            gh_repos = await github_service.list_user_repos(user.github_access_token)
            await _sync_repos(db, user.id, gh_repos)
        except Exception:
            pass  # Fall through to DB results on failure

    stmt = select(Repository).where(Repository.user_id == user.id).order_by(Repository.full_name)
    result = await db.execute(stmt)
    repos = result.scalars().all()

    return [RepositoryResponse.model_validate(r).model_dump(by_alias=True) for r in repos]


async def _sync_repos(db: AsyncSession, user_id: str, gh_repos: list[dict]) -> None:
    """Upsert GitHub repos into the local database."""
    for gh in gh_repos:
        gh_id = gh["id"]
        stmt = select(Repository).where(
            Repository.user_id == user_id, Repository.github_repo_id == gh_id
        )
        result = await db.execute(stmt)
        repo = result.scalar_one_or_none()

        if repo:
            repo.owner = gh.get("owner", {}).get("login", repo.owner)
            repo.name = gh.get("name", repo.name)
            repo.full_name = gh.get("full_name", repo.full_name)
            repo.is_private = gh.get("private", repo.is_private)
            repo.default_branch = gh.get("default_branch", repo.default_branch)
            repo.language = gh.get("language")
            repo.html_url = gh.get("html_url")
            repo.description = gh.get("description")
        else:
            repo = Repository(
                user_id=user_id,
                github_repo_id=gh_id,
                owner=gh.get("owner", {}).get("login", ""),
                name=gh.get("name", ""),
                full_name=gh.get("full_name", ""),
                is_private=gh.get("private", False),
                default_branch=gh.get("default_branch", "main"),
                language=gh.get("language"),
                html_url=gh.get("html_url"),
                description=gh.get("description"),
            )
            db.add(repo)

    await db.commit()


# ── GET /api/repos/:id ───────────────────────────────────────────────────────

@router.get("/{repo_id}")
async def get_repo(
    repo_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = await _require_ownership(db, repo_id, user.id)
    return RepositoryResponse.model_validate(repo).model_dump(by_alias=True)


# ── POST /api/repos/:id/index ────────────────────────────────────────────────

@router.post("/{repo_id}/index")
async def start_index(
    repo_id: str,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Start indexing a repository as a background task."""
    repo = await _require_ownership(db, repo_id, user.id)

    if repo.index_status == "INDEXING":
        # If it's been stuck for more than 10 minutes, allow re-indexing (crash recovery)
        from datetime import datetime, timezone, timedelta
        if repo.updated_at and (datetime.now(timezone.utc) - repo.updated_at) < timedelta(minutes=10):
            raise HTTPException(status.HTTP_409_CONFLICT, "Indexing is already in progress")
        logger.warning("Repo %s was stuck in INDEXING, allowing re-index", repo_id)

    if not user.github_access_token:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "GitHub access token not available")

    # Set status immediately so the client can show progress
    repo.index_status = "INDEXING"
    repo.error_message = None
    repo.files_processed = 0
    repo.chunk_count = 0
    await db.commit()
    await db.refresh(repo)

    # Run in the background
    background_tasks.add_task(
        indexing_service.index_repository,
        repo_id,
        user.github_access_token,
    )

    return RepositoryResponse.model_validate(repo).model_dump(by_alias=True)


# ── GET /api/repos/:id/status ────────────────────────────────────────────────

@router.get("/{repo_id}/status")
async def index_status(
    repo_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = await _require_ownership(db, repo_id, user.id)
    resp = IndexStatusResponse(
        repository_id=repo.id,
        index_status=repo.index_status,
        files_total=repo.files_total,
        files_processed=repo.files_processed,
        chunk_count=repo.chunk_count,
        indexed_at=repo.indexed_at,
        error_message=repo.error_message,
    )
    return resp.model_dump(by_alias=True)


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _require_ownership(db: AsyncSession, repo_id: str, user_id: str) -> Repository:
    repo = await db.get(Repository, repo_id)
    if repo is None or repo.user_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Repository not found or unauthorized")
    return repo
