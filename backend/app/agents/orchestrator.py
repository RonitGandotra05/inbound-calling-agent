"""
Orchestrator – Routes queries through the 3-agent pipeline.
"""

import logging
import time
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.agents.router_agent import route_query
from app.agents.conversation_agent import handle_information_query
from app.agents.action_agent import handle_action
from app.models.models import Company, CompanyService, Interaction
from app.utils.company_config import get_company_context

logger = logging.getLogger(__name__)


async def process_query(
    query_text: str,
    twilio_number: str,
    customer_phone: str,
    db: AsyncSession,
    conversation_history: list[dict] | None = None,
    action_data: dict | None = None,
) -> dict:
    """
    Main entry point – processes a customer query end-to-end.

    1. Look up company by Twilio number
    2. Route query (clean + classify)
    3. Handle via conversation or action agent
    """
    start = time.time()
    conversation_history = conversation_history or []
    action_data = action_data or {}

    # 1. Resolve company
    result = await db.execute(
        select(Company).where(
            Company.phone_number == twilio_number,
            Company.is_active.is_(True),
        )
    )
    company = result.scalar_one_or_none()

    if company is None:
        logger.warning("No company for Twilio number %s", twilio_number)
        return {
            "response": "I apologize, but this number is not configured. Please try again later.",
            "intent": "error",
            "errors": ["Company not found for phone number"],
        }

    ctx = await get_company_context(str(company.id), db)

    # 2. Route
    route_result = await route_query(query_text, conversation_history)
    intent = route_result["intent"]
    action_type = route_result.get("actionType")
    refined = route_result["refinedQuery"]

    logger.info("[Orchestrator] intent=%s action=%s", intent, action_type or "N/A")

    response = ""
    is_action_complete = False
    updated_action_data = action_data
    interaction_id = None

    # 3. Dispatch
    if intent in ("information", "unclear"):
        conv_result = await handle_information_query(
            refined, str(company.id), ctx, conversation_history
        )
        response = conv_result["response"]

    elif intent == "action" and action_type:
        act_result = await handle_action(
            refined,
            action_type,
            str(company.id),
            ctx,
            customer_phone,
            conversation_history,
            action_data,
        )
        response = act_result["response"]
        updated_action_data = act_result["collectedData"]
        is_action_complete = act_result["isComplete"]

        # Persist completed interaction
        if is_action_complete:
            interaction = Interaction(
                company_id=company.id,
                type=action_type,
                customer_name=updated_action_data.get("customerName", "Unknown"),
                customer_phone=customer_phone,
                data=updated_action_data,
                summary=_summary(action_type, updated_action_data),
            )
            db.add(interaction)
            await db.flush()
            interaction_id = str(interaction.id)
    else:
        response = ctx.get(
            "fallbackMessage",
            "I'm not sure I understood that. Could you please rephrase?",
        )

    elapsed = round((time.time() - start) * 1000)
    logger.info("[Orchestrator] processed in %dms", elapsed)

    return {
        "response": response,
        "refinedQuery": refined,
        "intent": intent,
        "actionType": action_type,
        "actionData": updated_action_data,
        "isActionComplete": is_action_complete,
        "interactionId": interaction_id,
        "companyId": str(company.id),
        "companyName": company.name,
        "errors": route_result.get("errors", []),
    }


async def get_greeting(twilio_number: str, db: AsyncSession) -> str:
    """Return the company greeting for a phone number."""
    result = await db.execute(
        select(Company).where(Company.phone_number == twilio_number)
    )
    company = result.scalar_one_or_none()
    if company is None:
        return "Hello, thank you for calling. How may I assist you today?"
    return company.greeting or f"Hello, thank you for calling {company.name}. How may I assist you today?"


def _summary(action_type: str, data: dict) -> str:
    if action_type == "booking":
        return f"Booking for {data.get('serviceId', '?')} on {data.get('preferredDate', '?')} at {data.get('preferredTime', '?')}"
    if action_type == "complaint":
        desc = data.get("issueDescription", "")
        return f"Issue: {desc[:100]}"
    if action_type == "feedback":
        fb = data.get("feedbackContent", "")
        rating = data.get("rating", "")
        return f"Feedback{f' ({rating}/5)' if rating else ''}: {fb[:100]}"
    return f"{action_type} from {data.get('customerName', 'Unknown')}"
