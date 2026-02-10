"""
LLM Utility - Cerebras Chat Client with consistent response handling.
"""

from cerebras.cloud.sdk import Cerebras
from app.config.settings import get_settings
from dataclasses import dataclass


settings = get_settings()

# Initialize Cerebras client
_client = None


def _get_client() -> Cerebras:
    global _client
    if _client is None:
        if not settings.cerebras_api_key:
            raise RuntimeError("CEREBRAS_API_KEY not configured")
        _client = Cerebras(api_key=settings.cerebras_api_key)
    return _client


@dataclass
class ChatResponse:
    """Response from the LLM."""
    text: str
    model: str = ""
    usage: dict | None = None


async def cerebras_chat(
    messages: list[dict],
    model: str = "llama-3.3-70b",
    temperature: float = 0.2,
    max_tokens: int = 2048,
    top_p: float = 1.0,
) -> ChatResponse:
    """
    Send messages to Cerebras and collect the streamed response.

    Args:
        messages: List of dicts with 'role' and 'content'
        model: Model name
        temperature: Sampling temperature
        max_tokens: Max completion tokens
        top_p: Top-p sampling

    Returns:
        ChatResponse with full text
    """
    client = _get_client()

    stream = client.chat.completions.create(
        messages=messages,
        model=model,
        stream=True,
        max_completion_tokens=max_tokens,
        temperature=temperature,
        top_p=top_p,
    )

    full_response = ""
    for chunk in stream:
        delta = chunk.choices[0].delta
        if delta and delta.content:
            full_response += delta.content

    return ChatResponse(text=full_response.strip(), model=model)
