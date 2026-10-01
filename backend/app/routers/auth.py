"""Auth router — GitHub OAuth flow, /me, /logout."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import RedirectResponse
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas import UserResponse
from app.services import github_service

router = APIRouter()


def _create_jwt(user_id: str) -> str:
    """Issue a signed JWT for the given user id."""
    expire = datetime.now(timezone.utc) + timedelta(days=settings.jwt_expire_days)
    return jwt.encode(
        {"sub": user_id, "exp": expire},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


# ── GET /api/auth/login-url ──────────────────────────────────────────────────

@router.get("/login-url")
async def login_url():
    """Return the GitHub OAuth authorize URL for the frontend to redirect to."""
    return {"url": f"/api/auth/github"}


# ── GET /api/auth/github ─────────────────────────────────────────────────────

@router.get("/github")
async def github_redirect():
    """Redirect the user to GitHub for OAuth authorization."""
    url = github_service.get_authorize_url()
    return RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)


# ── GET /api/auth/github/callback ────────────────────────────────────────────

@router.get("/github/callback")
async def github_callback(
    code: str | None = None,
    error: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Handle the OAuth callback from GitHub:
    1. Exchange code → access token
    2. Fetch GitHub profile
    3. Upsert user in the database
    4. Set JWT cookie
    5. Redirect to the frontend
    """
    if error or not code:
        return RedirectResponse(
            url=f"{settings.frontend_url}/login?error=oauth",
            status_code=status.HTTP_302_FOUND,
        )

    try:
        access_token = await github_service.exchange_code_for_token(code)
        profile = await github_service.get_user_profile(access_token)
    except Exception:
        return RedirectResponse(
            url=f"{settings.frontend_url}/login?error=token",
            status_code=status.HTTP_302_FOUND,
        )

    github_id = str(profile["id"])

    # Upsert user
    stmt = select(User).where(User.github_id == github_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user:
        user.github_username = profile.get("login", user.github_username)
        user.display_name = profile.get("name") or profile.get("login")
        user.avatar_url = profile.get("avatar_url")
        user.github_access_token = access_token
    else:
        user = User(
            github_id=github_id,
            github_username=profile.get("login", ""),
            display_name=profile.get("name") or profile.get("login", ""),
            avatar_url=profile.get("avatar_url"),
            github_access_token=access_token,
        )
        db.add(user)

    await db.commit()
    await db.refresh(user)

    # Set JWT as HTTP-only cookie and redirect to frontend callback page
    token = _create_jwt(user.id)
    response = RedirectResponse(
        url=f"{settings.frontend_url}/auth/callback",
        status_code=status.HTTP_302_FOUND,
    )
    response.set_cookie(
        key="token",
        value=token,
        httponly=True,
        max_age=settings.jwt_expire_days * 86400,
        samesite="none",
        secure=True,
        path="/",
    )
    return response


# ── GET /api/auth/me ──────────────────────────────────────────────────────────

@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    """Return the current authenticated user."""
    return UserResponse.model_validate(user).model_dump(by_alias=True)


# ── POST /api/auth/logout ────────────────────────────────────────────────────

@router.post("/logout")
async def logout(response: Response):
    """Clear the auth cookie."""
    response.delete_cookie(key="token", path="/")
    return {"message": "Logged out"}
