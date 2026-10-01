"""GitHub API service — OAuth token exchange, user profile, repo operations."""

from __future__ import annotations

from typing import Any

import httpx

from app.config import settings

GITHUB_API = "https://api.github.com"
GITHUB_OAUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"


def get_authorize_url() -> str:
    """Build the GitHub OAuth authorize redirect URL."""
    params = {
        "client_id": settings.github_client_id,
        "scope": "user:email repo",
    }
    qs = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{GITHUB_OAUTH_URL}?{qs}"


async def exchange_code_for_token(code: str) -> str:
    """Exchange an OAuth code for an access token."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            GITHUB_TOKEN_URL,
            json={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        data = resp.json()

    access_token: str | None = data.get("access_token")
    if not access_token:
        raise ValueError(f"GitHub token exchange failed: {data.get('error_description', data)}")
    return access_token


async def get_user_profile(access_token: str) -> dict[str, Any]:
    """Fetch the authenticated user's GitHub profile."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{GITHUB_API}/user",
            headers=_auth_headers(access_token),
        )
        resp.raise_for_status()
        return resp.json()


async def list_user_repos(access_token: str, per_page: int = 100) -> list[dict[str, Any]]:
    """Fetch all repositories visible to the authenticated user (paginated)."""
    repos: list[dict[str, Any]] = []
    page = 1
    async with httpx.AsyncClient(timeout=30) as client:
        while True:
            resp = await client.get(
                f"{GITHUB_API}/user/repos",
                params={
                    "per_page": per_page,
                    "page": page,
                    "sort": "updated",
                    "direction": "desc",
                },
                headers=_auth_headers(access_token),
            )
            resp.raise_for_status()
            batch = resp.json()
            if not batch:
                break
            repos.extend(batch)
            if len(batch) < per_page:
                break
            page += 1
    return repos


async def get_repo_contents(
    access_token: str, owner: str, repo: str, path: str = ""
) -> list[dict[str, Any]]:
    """Get the contents of a directory in a repository."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}",
            headers=_auth_headers(access_token),
        )
        resp.raise_for_status()
        data = resp.json()
        return data if isinstance(data, list) else [data]


async def get_file_content(access_token: str, owner: str, repo: str, path: str) -> str:
    """Download the raw content of a file from a repository."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}",
            headers={
                **_auth_headers(access_token),
                "Accept": "application/vnd.github.v3.raw",
            },
        )
        resp.raise_for_status()
        return resp.text


def _auth_headers(access_token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
