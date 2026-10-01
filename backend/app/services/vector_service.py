"""Qdrant vector-database service — collection management, upsert, search.

Uses **sentence-transformers** for local embeddings and **qdrant-client**
for vector storage / retrieval.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Any

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)
from fastembed.embedding import TextEmbedding

from app.config import settings

logger = logging.getLogger(__name__)

# ── Singletons (initialised lazily) ──────────────────────────────────────────

_qdrant: QdrantClient | None = None
_embedder: TextEmbedding | None = None


def _get_qdrant() -> QdrantClient:
    global _qdrant
    if _qdrant is None:
        _qdrant = QdrantClient(
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key,
        )
    return _qdrant


def _get_embedder() -> TextEmbedding:
    global _embedder
    if _embedder is None:
        logger.info("Loading fastembed default model (BAAI/bge-small-en-v1.5) …")
        _embedder = TextEmbedding()
    return _embedder


# ── Public API ────────────────────────────────────────────────────────────────


async def ensure_collection() -> None:
    """Create the Qdrant collection if it does not already exist."""
    client = _get_qdrant()

    def _ensure() -> None:
        collections = [c.name for c in client.get_collections().collections]
        if settings.qdrant_collection not in collections:
            client.create_collection(
                collection_name=settings.qdrant_collection,
                vectors_config=VectorParams(
                    size=settings.embedding_dimensions,
                    distance=Distance.COSINE,
                ),
            )
            logger.info("Created Qdrant collection: %s", settings.qdrant_collection)

        # Ensure payload index exists for filtering (required by Qdrant for filtering)
        try:
            client.create_payload_index(
                collection_name=settings.qdrant_collection,
                field_name="repository_id",
                field_schema="keyword",
            )
        except Exception as e:
            # Qdrant might throw if it already exists, which is fine
            logger.debug("Payload index check: %s", e)

    await asyncio.to_thread(_ensure)


async def get_embedding(text: str) -> list[float]:
    """Generate an embedding vector for *text* using sentence-transformers (runs in a thread)."""
    def _embed() -> list[float]:
        model = _get_embedder()
        vector = list(model.embed([text]))[0]
        return vector.tolist()

    return await asyncio.to_thread(_embed)


async def get_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """Batch-embed multiple texts at once (much faster than one-by-one)."""
    def _embed_batch() -> list[list[float]]:
        model = _get_embedder()
        vectors = list(model.embed(texts))
        return [v.tolist() for v in vectors]

    return await asyncio.to_thread(_embed_batch)


async def upsert_point(
    vector: list[float],
    payload: dict[str, Any],
) -> None:
    """Upsert a single point into Qdrant."""
    client = _get_qdrant()
    point_id = str(uuid.uuid4())

    def _upsert() -> None:
        client.upsert(
            collection_name=settings.qdrant_collection,
            points=[PointStruct(id=point_id, vector=vector, payload=payload)],
        )

    await asyncio.to_thread(_upsert)


async def upsert_points_batch(
    points: list[tuple[list[float], dict[str, Any]]],
) -> None:
    """Batch-upsert a list of (vector, payload) tuples."""
    if not points:
        return
    client = _get_qdrant()
    structs = [
        PointStruct(id=str(uuid.uuid4()), vector=vec, payload=pl)
        for vec, pl in points
    ]

    def _upsert() -> None:
        for i in range(0, len(structs), 100):
            client.upsert(
                collection_name=settings.qdrant_collection,
                points=structs[i : i + 100],
            )

    await asyncio.to_thread(_upsert)


async def search(
    query_vector: list[float],
    repository_id: str,
    limit: int = 5,
) -> list[dict[str, Any]]:
    """Search Qdrant for code chunks matching *query_vector*, filtered by repo."""
    client = _get_qdrant()

    def _search() -> list[dict[str, Any]]:
        response = client.query_points(
            collection_name=settings.qdrant_collection,
            query=query_vector,
            query_filter=Filter(
                must=[
                    FieldCondition(
                        key="repository_id",
                        match=MatchValue(value=repository_id),
                    )
                ]
            ),
            limit=limit,
            with_payload=True,
        )
        return [
            {"score": hit.score, "payload": hit.payload}
            for hit in response.points
        ]

    return await asyncio.to_thread(_search)


async def delete_by_repository(repository_id: str) -> None:
    """Delete all points belonging to a repository (useful for re-indexing)."""
    client = _get_qdrant()

    def _delete() -> None:
        client.delete(
            collection_name=settings.qdrant_collection,
            points_selector=Filter(
                must=[
                    FieldCondition(
                        key="repository_id",
                        match=MatchValue(value=repository_id),
                    )
                ]
            ),
        )

    await asyncio.to_thread(_delete)
