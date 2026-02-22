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


import uuid
import logging
from fastapi import HTTPException
from app.models.models import Company
from app.models.schemas import TryForFreeRequest
from app.utils.twilio_client import initiate_outbound_call
from app.utils.embeddings import index_text
from app.utils.company_config import invalidate_cache

logger = logging.getLogger(__name__)

@router.post("/try-for-free")
async def try_for_free(body: TryForFreeRequest, db: AsyncSession = Depends(get_db)):
    """
    1. Create a temporary company.
    2. Embed the provided knowledge text into Pinecone mapped to that company.
    3. Trigger a Twilio outbound call to the provided phone number.
    """
    temp_company_id = uuid.uuid4()
    
    # Create temporary company record
    company = Company(
        id=temp_company_id,
        name=f"Demo-{temp_company_id.hex[:6]}",
        slug=f"demo-{temp_company_id.hex[:6]}",
        phone_number=None, # Only inbound uses this mapping
        greeting="Hi there! I am your custom OmniVoice Labs agent. How can I help you regarding the policy you provided?",
        is_active=True
    )
    db.add(company)
    await db.commit()
    
    # Ingest text into Pinecone (blocks until complete to ensure agent has data)
    try:
        await index_text(
            company_id=str(temp_company_id),
            text=body.knowledge_text,
            metadata={"source": "try-for-free"}
        )
    except Exception as e:
        logger.error(f"Failed to index demo text: {e}")
        raise HTTPException(status_code=500, detail="Failed to build agent knowledge base.")

    # Invalidate cache just in case
    invalidate_cache(str(temp_company_id))

    # Initiate Call
    call_sid = initiate_outbound_call(
        to_phone=body.phone_number,
        company_id=str(temp_company_id)
    )

    if not call_sid:
        raise HTTPException(status_code=500, detail="Failed to initiate call with Twilio. Verify billing and credentials.")

    return {
        "status": "success",
        "company_id": str(temp_company_id),
        "call_sid": call_sid
    }
