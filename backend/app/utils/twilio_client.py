"""
Twilio integration utilities for outbound calling.
"""

import logging
from typing import Optional
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from app.config.settings import get_settings

logger = logging.getLogger(__name__)


def initiate_outbound_call(to_phone: str, company_id: str) -> Optional[str]:
    """
    Initiates an outbound call via Twilio.
    Returns the Twilio Call SID on success, None on failure.
    """
    settings = get_settings()

    if not settings.twilio_account_sid or not settings.twilio_auth_token:
        logger.error("Twilio credentials not configured")
        return None

    try:
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        
        # When the user answers, Twilio will hit this webhook to get TwiML instructions.
        # We pass the temporary company_id via query parameter so the orchestrator knows the persona.
        callback_url = f"{settings.api_base_url}/api/twilio/outbound-answer?company_id={company_id}"
        
        call = client.calls.create(
            to=to_phone,
            from_=settings.twilio_phone_number,
            url=callback_url,
            method="POST",
            record=True  # Optional: record the demo call
        )
        
        logger.info(f"Initiated outbound call to {to_phone} for company {company_id}. SID: {call.sid}")
        return call.sid

    except TwilioRestException as e:
        logger.error(f"Twilio API error initiating call to {to_phone}: {str(e)}")
        return None
    except Exception as e:
        logger.exception(f"Unexpected error initiating call to {to_phone}")
        return None
