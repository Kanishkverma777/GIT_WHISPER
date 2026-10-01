"""Chat router — sessions, messages, SSE streaming."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.chat_session import ChatSession
from app.models.user import User
from app.schemas import (
    ChatMessageResponse,
    ChatSessionResponse,
    CreateSessionRequest,
    SendMessageRequest,
)
from app.services import chat_service

router = APIRouter()


# ── POST /api/chat/sessions ──────────────────────────────────────────────────

@router.post("/sessions")
async def create_session(
    body: CreateSessionRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        session = await chat_service.create_session(
            db, user.id, body.repository_id, body.title
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))

    return ChatSessionResponse.model_validate(session).model_dump(by_alias=True)


# ── GET /api/chat/sessions?repositoryId=:id ──────────────────────────────────

@router.get("/sessions")
async def list_sessions(
    repositoryId: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sessions = await chat_service.list_sessions(db, user.id, repositoryId)
    return [
        ChatSessionResponse.model_validate(s).model_dump(by_alias=True)
        for s in sessions
    ]


# ── GET /api/chat/sessions/:id ───────────────────────────────────────────────

@router.get("/sessions/{session_id}")
async def get_messages(
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify ownership
    session = await db.get(ChatSession, session_id)
    if session is None or session.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Chat session not found")

    messages = await chat_service.get_messages(db, session_id)
    return [
        ChatMessageResponse.model_validate(m).model_dump(by_alias=True)
        for m in messages
    ]


# ── POST /api/chat/sessions/:id/messages (SSE stream) ────────────────────────

@router.post("/sessions/{session_id}/messages")
async def send_message(
    session_id: str,
    body: SendMessageRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Stream the RAG-powered assistant response as Server-Sent Events."""
    if not body.content.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "content is required")

    return StreamingResponse(
        chat_service.stream_message(db, user.id, session_id, body.content.strip()),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
