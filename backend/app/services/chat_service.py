"""Chat service — RAG retrieval + Groq streaming, persisting messages."""

from __future__ import annotations

import json
import logging
from typing import AsyncIterator

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat_message import ChatMessage
from app.models.chat_session import ChatSession
from app.models.repository import Repository
from app.schemas import ChatMessageResponse, CitationResponse
from app.services import groq_service, vector_service

logger = logging.getLogger(__name__)


async def create_session(
    db: AsyncSession,
    user_id: str,
    repository_id: str,
    title: str | None = None,
) -> ChatSession:
    """Create a new chat session for a repository."""
    repo = await db.get(Repository, repository_id)
    if repo is None or repo.user_id != user_id:
        raise ValueError("Repository not found or unauthorized")
    if repo.index_status != "READY":
        raise ValueError("Repository must be indexed before chatting")

    session_title = title or "NEW CHAT"
    session = ChatSession(
        user_id=user_id,
        repository_id=repository_id,
        title=session_title,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def list_sessions(
    db: AsyncSession, user_id: str, repository_id: str
) -> list[ChatSession]:
    """List chat sessions for a user + repository."""
    stmt = (
        select(ChatSession)
        .where(ChatSession.user_id == user_id, ChatSession.repository_id == repository_id)
        .order_by(ChatSession.created_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_messages(db: AsyncSession, session_id: str) -> list[ChatMessage]:
    """Get all messages for a chat session, oldest first."""
    stmt = (
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_context_for_query(
    repository_id: str, query: str, top_k: int = 5
) -> tuple[str, list[dict]]:
    """
    RAG retrieval — embed the query, search Qdrant, return
    (context_text, citations).
    """
    query_embedding = await vector_service.get_embedding(query)
    results = await vector_service.search(query_embedding, repository_id, limit=top_k)

    top_chunks = [r["payload"] for r in results]

    context_text = "\n\n---\n\n".join(
        f"```{chunk.get('language', '')}\n{chunk['content']}\n```"
        for chunk in top_chunks
    )

    citations = [
        {
            "file_path": chunk.get("file_path", ""),
            "start_line": chunk.get("start_line"),
            "end_line": chunk.get("end_line"),
            "language": chunk.get("language"),
        }
        for chunk in top_chunks
    ]

    return context_text, citations


async def stream_message(
    db: AsyncSession,
    user_id: str,
    session_id: str,
    user_content: str,
) -> AsyncIterator[str]:
    """
    Full RAG pipeline as an SSE generator:
    1. Save user message → emit ``user_message`` event
    2. Retrieve context from Qdrant
    3. Stream Groq completion → emit ``token`` events
    4. Save assistant message → emit ``assistant_message`` event
    5. Emit ``done``
    """
    # ── 1. Validate session ──────────────────────────────────────────────
    session = await db.get(ChatSession, session_id)
    if session is None or session.user_id != user_id:
        yield _sse("error", {"message": "Chat session not found"})
        return

    repo = await db.get(Repository, session.repository_id)
    if repo is None or repo.index_status != "READY":
        yield _sse("error", {"message": "Repository is not ready for chat"})
        return

    # ── 2. Persist user message & update title if needed ─────────────────
    user_msg = ChatMessage(
        session_id=session_id,
        role="USER",
        content=user_content,
        citations=[],
    )
    db.add(user_msg)

    if session.title.upper() == "NEW CHAT":
        new_title = user_content[:30].strip()
        if len(user_content) > 30:
            new_title += "..."
        session.title = new_title.upper()
        db.add(session)

    await db.commit()
    await db.refresh(user_msg)

    user_msg_resp = ChatMessageResponse.model_validate(user_msg)
    yield _sse("user_message", user_msg_resp.model_dump(by_alias=True, mode="json"))

    # ── 3. RAG retrieval ─────────────────────────────────────────────────
    try:
        context_text, citations = await get_context_for_query(
            repo.id, user_content
        )
    except Exception as exc:
        logger.warning("RAG retrieval failed: %s", exc)
        context_text = ""
        citations = []

    # ── 4. Build prompts & stream LLM ────────────────────────────────────
    system_prompt = groq_service.build_system_prompt(repo.full_name)
    user_prompt = groq_service.build_user_prompt(context_text, user_content)

    full_response = ""
    async for token in groq_service.stream_chat_completion(system_prompt, user_prompt):
        full_response += token
        yield _sse("token", token)

    # ── 5. Save assistant message ────────────────────────────────────────
    assistant_msg = ChatMessage(
        session_id=session_id,
        role="ASSISTANT",
        content=full_response,
        citations=citations,
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)

    asst_resp = ChatMessageResponse.model_validate(assistant_msg)
    yield _sse("assistant_message", asst_resp.model_dump(by_alias=True, mode="json"))

    # ── 6. Done ──────────────────────────────────────────────────────────
    yield _sse("done", {})


def _sse(event: str, data: object) -> str:
    """Format a single Server-Sent Event frame."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"
