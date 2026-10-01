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
        f'You are an expert code assistant for the GitHub repository "{repo_full_name}".\n\n'
        f'You will receive relevant code snippets from the repository, each labeled with '
        f'its file path. You MUST use these snippets to answer the user\'s questions.\n\n'
        f'Rules:\n'
        f'- Always reference specific file paths when discussing code.\n'
        f'- If asked about the tech stack, look for package.json, requirements.txt, '
        f'config files, and import statements in the provided snippets.\n'
        f'- If the snippets don\'t contain enough info to answer, say so clearly '
        f'and explain what you CAN see from the provided code.\n'
        f'- Be helpful, precise, and concise.'
    )


def build_user_prompt(context_text: str, user_content: str) -> str:
    """Combine retrieved code context with the user's question."""
    if not context_text.strip():
        return (
            f"No relevant code snippets were found for this question. "
            f"Please answer based on your general knowledge:\n\n{user_content}"
        )
    return (
        f"Here are relevant code snippets from the repository:\n\n"
        f"{context_text}\n\n---\n\n"
        f"Using the code snippets above, answer the following question:\n\n"
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
