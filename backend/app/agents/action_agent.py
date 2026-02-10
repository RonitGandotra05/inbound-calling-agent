"""
Action Agent – Unified handler for bookings, complaints, and feedback.
Extracts structured data from conversation and persists to database.
"""

import json
import logging
from app.utils.llm import cerebras_chat

logger = logging.getLogger(__name__)

# ── Field requirements per action type ────────────────────────────────

ACTION_SCHEMAS: dict[str, dict] = {
    "booking": {
        "required": ["customerName", "serviceId", "preferredDate", "preferredTime"],
        "optional": ["notes"],
    },
    "complaint": {
        "required": ["customerName", "issueDescription"],
        "optional": ["serviceId", "urgency"],
    },
    "feedback": {
        "required": ["customerName", "feedbackContent"],
        "optional": ["serviceId", "rating"],
    },
}


def _action_system_prompt(
    action_type: str,
    company_ctx: dict,
    collected: dict,
    schema: dict,
) -> str:
    labels = {
        "booking": "appointment booking",
        "complaint": "complaint registration",
        "feedback": "feedback collection",
    }
    missing = [f for f in schema["required"] if f not in collected]
    collected_text = (
        "\n".join(f"- {k}: {v}" for k, v in collected.items()) or "(none yet)"
    )
    missing_text = "\n".join(f"- {f}" for f in missing) or "(all required info collected!)"
    task = (
        f"Ask for the next missing piece of information naturally. Focus on: {missing[0]}"
        if missing
        else f"Confirm all details with the customer and let them know you're processing their {action_type}."
    )

    return f"""You are handling a {labels.get(action_type, action_type)} for {company_ctx['companyName']}.

SERVICES AVAILABLE: {company_ctx['services']}
BUSINESS HOURS: {company_ctx['businessHours']}

ALREADY COLLECTED:
{collected_text}

STILL NEEDED:
{missing_text}

YOUR TASK:
{task}

Be conversational, professional, and efficient. Keep responses appropriate for phone."""


# ── Public API ────────────────────────────────────────────────────────

async def handle_action(
    query: str,
    action_type: str,
    company_id: str,
    company_context: dict,
    customer_phone: str,
    conversation_history: list[dict] | None = None,
    existing_data: dict | None = None,
) -> dict:
    """
    Process an action request (booking / complaint / feedback).

    Returns dict with keys: response, collectedData, isComplete, errors
    """
    existing_data = existing_data or {}

    try:
        schema = ACTION_SCHEMAS.get(action_type)
        if schema is None:
            raise ValueError(f"Unknown action type: {action_type}")

        # 1. Extract data from current utterance
        extracted = await _extract_data(query, action_type, existing_data)
        collected = {**existing_data, **extracted}

        # 2. Check completeness
        missing = [f for f in schema["required"] if f not in collected]
        is_complete = len(missing) == 0

        # 3. Generate response
        sys_prompt = _action_system_prompt(action_type, company_context, collected, schema)
        history_text = ""
        if conversation_history:
            history_text = "\n\nCONVERSATION:\n" + "\n".join(
                f"{m['role']}: {m['content']}" for m in conversation_history[-6:]
            )

        resp = await cerebras_chat(
            [
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": f'Customer said: "{query}"{history_text}'},
            ],
            temperature=0.7,
            max_tokens=256,
        )

        return {
            "response": resp.text,
            "collectedData": collected,
            "isComplete": is_complete,
            "errors": [],
        }

    except Exception as exc:
        logger.exception("Action agent error")
        return {
            "response": "I apologize, but I'm having trouble processing that. Could you please repeat?",
            "collectedData": existing_data,
            "isComplete": False,
            "errors": [str(exc)],
        }


# ── Data extraction ──────────────────────────────────────────────────

async def _extract_data(query: str, action_type: str, existing: dict) -> dict:
    prompt = f"""Extract structured data from this customer message for a {action_type}.

Message: "{query}"

Already known: {json.dumps(existing)}

Extract any new information. Return JSON only:
{{
  "customerName": "<name or null>",
  "serviceId": "<service name mentioned or null>",
  "preferredDate": "<date or null>",
  "preferredTime": "<time or null>",
  "issueDescription": "<issue description or null>",
  "feedbackContent": "<feedback or null>",
  "rating": <1-5 or null>,
  "urgency": "<low|medium|high or null>",
  "notes": "<any additional notes or null>"
}}

Only include fields with actual values extracted, use null for missing."""

    try:
        resp = await cerebras_chat(
            [
                {"role": "system", "content": "You extract structured data from text. Respond with JSON only."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=256,
        )

        # pull JSON from response
        text = resp.text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            data = json.loads(text[start:end])
            return {k: v for k, v in data.items() if v is not None}
    except Exception as exc:
        logger.warning("Data extraction failed: %s", exc)

    return {}
