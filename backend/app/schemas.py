"""Pydantic schemas for request / response serialisation.

All response models inherit from CamelModel so that Python snake_case
fields are serialised as camelCase JSON — matching the Next.js client.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


# ── Base ──────────────────────────────────────────────────────────────────────


class CamelModel(BaseModel):
    """Base model that converts snake_case fields → camelCase JSON."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


# ── Auth ──────────────────────────────────────────────────────────────────────


class UserResponse(CamelModel):
    id: str
    github_id: str
    github_username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


# ── Repositories ──────────────────────────────────────────────────────────────


class RepositoryResponse(CamelModel):
    id: str
    github_repo_id: int
    owner: str
    name: str
    full_name: str
    is_private: bool
    default_branch: str
    language: Optional[str] = None
    html_url: Optional[str] = None
    description: Optional[str] = None
    index_status: str
    indexed_at: Optional[datetime] = None
    chunk_count: int = 0
    files_total: int = 0
    files_processed: int = 0
    error_message: Optional[str] = None


class IndexStatusResponse(CamelModel):
    repository_id: str
    index_status: str
    files_total: int
    files_processed: int
    chunk_count: int
    indexed_at: Optional[datetime] = None
    error_message: Optional[str] = None


# ── Chat ──────────────────────────────────────────────────────────────────────


class CreateSessionRequest(BaseModel):
    repository_id: str = ""
    title: Optional[str] = None

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class SendMessageRequest(BaseModel):
    content: str


class CitationResponse(CamelModel):
    file_path: str
    start_line: Optional[int] = None
    end_line: Optional[int] = None
    language: Optional[str] = None


class ChatMessageResponse(CamelModel):
    id: str
    role: str
    content: str
    citations: list[CitationResponse] = []
    created_at: datetime


class ChatSessionResponse(CamelModel):
    id: str
    repository_id: str
    title: str
    created_at: datetime
