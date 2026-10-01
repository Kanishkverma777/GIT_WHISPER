"""Groq LLM service — prompt building and streaming chat completions."""

from __future__ import annotations

from typing import AsyncIterator

from groq import AsyncGroq

from app.config import settings

_client: AsyncGroq | None = None


def _get_client() -> AsyncGroq:
    global _client
    if _client is None:
        _client = AsyncGroq(api_key=settings.groq_api_key)
    return _client


def build_system_prompt(repo_full_name: str) -> str:
    """System prompt that grounds the assistant on the repo context."""
    return (
        f'You are an AI assistant that helps users understand and work with '
        f'the codebase of the repository "{repo_full_name}".\n\n'
        f'You will be given relevant code snippets from the repository to answer '
        f'the user\'s questions. Use the provided code snippets to inform your '
        f'answers. If the code snippets are not relevant, you can say so and '
        f'answer based on your general knowledge.\n\n'
        f'Always be helpful, clear, and concise. If you are unsure about something, say so.'
    )


def build_user_prompt(context_text: str, user_content: str) -> str:
    """Combine retrieved code context with the user's question."""
    if not context_text.strip():
        return user_content
    return (
        f"Here are some relevant code snippets from the repository:\n\n"
        f"{context_text}\n\n---\n\n"
        f"Based on the above code snippets, please answer the following question:\n\n"
        f"{user_content}"
    )


async def stream_chat_completion(
    system_prompt: str,
    user_prompt: str,
) -> AsyncIterator[str]:
    """
    Stream tokens from Groq and yield each content chunk as it arrives.
    """
    client = _get_client()
    stream = await client.chat.completions.create(
        model=settings.groq_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        stream=True,
        temperature=settings.groq_temperature,
        max_tokens=settings.groq_max_tokens,
    )

    async for chunk in stream:
        content = chunk.choices[0].delta.content or ""
        if content:
            yield content
