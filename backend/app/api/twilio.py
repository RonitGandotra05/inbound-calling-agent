"""
FastAPI router for handling Twilio webhooks.
"""

import logging
from fastapi import APIRouter, Request, Form, BackgroundTasks
from fastapi.responses import HTMLResponse
from twilio.twiml.voice_response import VoiceResponse, Connect

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/outbound-answer")
async def outbound_answer(
    request: Request,
    company_id: str,
    CallSid: str = Form(...),
    From: str = Form(...),
    To: str = Form(...)
):
    """
    Webhook triggered by Twilio when the user answers the outbound "Try for free" call.
    We respond with TwiML instructing Twilio to connect the call to our Media Stream WebSocket.
    """
    logger.info(f"[Twilio] Outbound call {CallSid} answered by {To}. Routing for company {company_id}")

    response = VoiceResponse()
    
    # Greet the user immediately using Twilio's basic TTS so there is zero dead air
    # while the WebSocket connection establishes
    response.say("Hello from OmniVoice Labs! Connecting you to your custom agent now.", voice="Polly.Matthew")

    # Connect the call to our WebSocket orchestrator endpoint
    # Note: Twilio requires wss:// for production, ws:// is okay for ngrok/local dev
    # We construct the WebSocket URL based on the API base URL
    base_url = str(request.base_url).rstrip("/")
    ws_url = base_url.replace("http://", "ws://").replace("https://", "wss://")
    stream_url = f"{ws_url}/api/orchestrator/stream?company_id={company_id}&call_sid={CallSid}"

    connect = Connect()
    connect.stream(url=stream_url)
    response.append(connect)

    # Return the XML response Twilio expects
    return HTMLResponse(content=str(response), media_type="application/xml")
