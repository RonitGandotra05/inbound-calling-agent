"""
Router Agent – Cleans input and determines intent in one LLM call.
Replaces the old refiner + classifier combo.
"""

import json
import logging
from app.utils.llm import cerebras_chat

logger = logging.getLogger(__name__)

ROUTER_SYSTEM_PROMPT = """You are a query router for a customer service phone system.

Your job is to:
1. Clean the user's query (fix typos, remove filler words, translate non-English to English)
2. Determine the user's intent

Intent categories:
- "information": User wants to learn something (hours, prices, services, policies, etc.)
- "action": User wants to DO something (book appointment, file complaint, give feedback)
- "unclear": Cannot determine intent, need clarification

If intent is "action", also determine action type:
- "booking": Schedule appointment, reservation, meeting
- "complaint": Report problem, issue, dissatisfaction
- "feedback": Share opinion, suggestion, review

Respond in this exact JSON format:
{
  "refinedQuery": "<cleaned query in English>",
  "intent": "<information|action|unclear>",
  "actionType": "<booking|complaint|feedback|null>",
  "confidence": <0.0-1.0>
}"""


async def route_query(
    raw_query: str,
    conversation_history: list[dict] | None = None,
) -> dict:
    """
    Route a user query – clean it and determine intent.

    Returns dict with keys: refinedQuery, intent, actionType, confidence, errors
    """
    try:
        history_ctx = ""
        if conversation_history:
            recent = conversation_history[-5:]
            history_ctx = "\n\nRecent conversation:\n" + "\n".join(
                f"{m['role']}: {m['content']}" for m in recent
            )

        messages = [
            {"role": "system", "content": ROUTER_SYSTEM_PROMPT},
            {"role": "user", "content": f'Route this query: "{raw_query}"{history_ctx}'},
        ]

        response = await cerebras_chat(messages, temperature=0.2, max_tokens=256)

        # Parse JSON from response
        try:
            json_match = _extract_json(response.text)
            result = json.loads(json_match) if json_match else None
        except json.JSONDecodeError:
            result = None

        if result is None:
            logger.warning("Router could not parse LLM response: %s", response.text)
            result = {
                "refinedQuery": raw_query,
                "intent": "information",
                "actionType": None,
                "confidence": 0.5,
            }

        return {
            "refinedQuery": result.get("refinedQuery", raw_query),
            "intent": result.get("intent", "information"),
            "actionType": result.get("actionType"),
            "confidence": result.get("confidence", 0.5),
            "errors": [],
        }

    except Exception as exc:
        logger.exception("Router agent error")
        return {
            "refinedQuery": raw_query,
            "intent": "information",
            "actionType": None,
            "confidence": 0,
            "errors": [f"Router error: {exc}"],
        }


def _extract_json(text: str) -> str | None:
    """Pull the first JSON object out of a string."""
    depth = 0
    start = None
    for i, ch in enumerate(text):
        if ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start is not None:
                return text[start : i + 1]
    return None
