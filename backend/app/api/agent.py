"""
Agent API – Process customer queries through the agent pipeline.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.models.schemas import QueryRequest, QueryResponse
from app.agents.orchestrator import process_query, get_greeting

router = APIRouter()


@router.post("/process", response_model=QueryResponse)
async def process(body: QueryRequest, db: AsyncSession = Depends(get_db)):
    """
    Process a customer query end-to-end.
    Called by Twilio webhook handler or test UI.
    """
    result = await process_query(
        query_text=body.query,
        twilio_number=body.twilio_number,
        customer_phone=body.customer_phone,
        db=db,
        conversation_history=body.conversation_history,
        action_data=body.action_data,
    )

    return QueryResponse(
        response=result["response"],
        refined_query=result.get("refinedQuery"),
        intent=result.get("intent", "unknown"),
        action_type=result.get("actionType"),
        action_data=result.get("actionData", {}),
        is_action_complete=result.get("isActionComplete", False),
        interaction_id=result.get("interactionId"),
        company_name=result.get("companyName"),
        errors=result.get("errors", []),
    )


@router.get("/greeting")
async def greeting(twilio_number: str, db: AsyncSession = Depends(get_db)):
    """Get the company greeting for a Twilio number."""
    text = await get_greeting(twilio_number, db)
    return {"greeting": text}
