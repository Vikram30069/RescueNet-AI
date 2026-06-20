"""Voice call router — check on survivor safety via automated phone calls."""

import os
import logging
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Form, Response, Query
from pydantic import BaseModel
from dotenv import load_dotenv

from app.db import mock_db
from app.db.responders import normalize_india_whatsapp

logger = logging.getLogger("rescuenet.voice")
router = APIRouter()

BACKEND_DIR = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_DIR.parent

load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(BACKEND_DIR / ".env", override=True)

# ===========================
# Pydantic Schemas
# ===========================

class CallRequest(BaseModel):
    phone: str
    incident_id: str

class VoiceCallResponse(BaseModel):
    id: str
    phone: str
    incident_id: str
    status: str
    digits: Optional[str] = None
    safety_status: str
    twilio_sid: Optional[str] = None
    twilio_status: Optional[str] = None
    twilio_from: Optional[str] = None
    error: Optional[str] = None
    created_at: str
    updated_at: str

# ===========================
# Helper: Outbound Twilio Call
# ===========================

def _place_twilio_call(phone: str, call_id: str, incident: Optional[dict] = None) -> dict:
    """Place a real outbound call using Twilio API if configured."""
    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")
    twilio_from = os.getenv("TWILIO_VOICE_FROM", "")
    to_number = normalize_india_whatsapp(phone)["e164"]

    if not account_sid or not auth_token or account_sid.startswith("AC_REPLACE"):
        logger.info("Twilio Voice Call bypassed (credentials not configured).")
        return {"ok": False, "status": "simulated", "error": "Twilio credentials not configured."}

    if not twilio_from:
        return {
            "ok": False,
            "status": "failed",
            "error": "TWILIO_VOICE_FROM is not configured. Add a Twilio voice-capable number in E.164 format.",
        }

    if not to_number:
        return {"ok": False, "status": "failed", "error": "Invalid phone number."}

    try:
        from twilio.rest import Client
        client = Client(account_sid, auth_token)
        
        # Build TwiML with callback pointing to our public URL
        public_url = os.getenv("PUBLIC_URL", "http://localhost:8000")
        action_url = f"{public_url}/api/v1/voice/gather?call_id={call_id}"
        
        incident_context = ""
        if incident:
            incident_context = f"This alert is for {incident.get('title', 'an active emergency')} near {incident.get('location', 'your area')}. "

        twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Gather numDigits="1" action="{action_url}" method="POST" timeout="12">
                <Say voice="alice">Hello. This is RescueNet AI emergency response. {incident_context}We are checking your safety status. If you are safe, press 1. If you are trapped and need rescue, press 2. If you have critical injuries and need immediate medical help, press 3.</Say>
                <Pause length="1"/>
                <Say voice="alice">Again. Press 1 for safe. Press 2 for trapped. Press 3 for critical medical help.</Say>
            </Gather>
            <Say voice="alice">We did not receive your input. Please stay alert and keep your phone nearby. Goodbye.</Say>
        </Response>"""
        
        call = client.calls.create(
            to=to_number,
            from_=twilio_from,
            twiml=twiml
        )
        status = getattr(call, "status", None) or "queued"
        logger.info(f"Twilio Voice call created for {to_number}: sid={call.sid}, status={status}")
        return {
            "ok": True,
            "status": status,
            "sid": call.sid,
            "twilio_status": status,
            "twilio_from": twilio_from,
            "to": to_number,
        }
    except Exception as e:
        logger.error(f"Failed to place Twilio Voice call to {phone}: {e}")
        return {"ok": False, "status": "failed", "error": str(e), "twilio_from": twilio_from, "to": to_number}

# ===========================
# Endpoints
# ===========================

@router.post("/voice/call", response_model=VoiceCallResponse, status_code=201)
async def initiate_call(payload: CallRequest):
    """Initiate an automated voice assessment call to a survivor."""
    # First, verify incident exists
    incident = mock_db.get_incident(payload.incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Create the call log
    call_log = mock_db.create_voice_call(
        phone=payload.phone,
        incident_id=payload.incident_id,
        status="ringing"
    )

    # Place Twilio Call (if configured, runs in background/async)
    result = _place_twilio_call(payload.phone, call_log["id"], incident)
    mock_db.update_voice_call(
        call_log["id"],
        status=result.get("status", "failed"),
        twilio_sid=result.get("sid"),
        twilio_status=result.get("twilio_status"),
        twilio_from=result.get("twilio_from"),
        error=result.get("error"),
    )

    # Reload record
    updated_call = mock_db.get_voice_call(call_log["id"])
    return updated_call


@router.post("/voice/gather")
async def voice_gather(call_id: str = Query(...), Digits: str = Form(...)):
    """Twilio gather webhook called when victim presses a key."""
    call = mock_db.get_voice_call(call_id)
    if not call:
        logger.warning(f"Voice gather received invalid Call ID: {call_id}")
        twiml = '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error</Say></Response>'
        return Response(content=twiml, media_type="application/xml")

    safety_status = "unknown"
    message = "We did not receive your safety status. Please stand by."
    
    if Digits == "1":
        safety_status = "safe"
        message = "Thank you. You have reported that you are safe. Please stay indoors and wait for further instructions."
    elif Digits == "2":
        safety_status = "trapped"
        message = "We have recorded that you are trapped. Search and rescue teams are prioritizing your location."
    elif Digits == "3":
        safety_status = "critical"
        message = "Critical medical services have been dispatched. Emergency responders are on the way."

    # Update state
    mock_db.update_voice_call(call_id, status="completed", digits=Digits, safety_status=safety_status)

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
    <Response>
        <Say voice="alice">{message}</Say>
        <Say voice="alice">Goodbye and stay safe.</Say>
    </Response>"""
    return Response(content=twiml, media_type="application/xml")


@router.post("/voice/simulate-keypress", response_model=VoiceCallResponse)
async def simulate_keypress(call_id: str = Query(...), digits: str = Query(...)):
    """Simulate keypress input for testing local voice calling pipeline without webhook tunnels."""
    call = mock_db.get_voice_call(call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call log not found")

    safety_status = "unknown"
    if digits == "1":
        safety_status = "safe"
    elif digits == "2":
        safety_status = "trapped"
    elif digits == "3":
        safety_status = "critical"

    mock_db.update_voice_call(call_id, status="completed", digits=digits, safety_status=safety_status)
    updated_call = mock_db.get_voice_call(call_id)
    return updated_call


@router.get("/voice/calls", response_model=List[VoiceCallResponse])
async def list_calls(incident_id: Optional[str] = Query(None, description="Filter by incident ID")):
    """List all voice call assessments."""
    return mock_db.get_voice_calls(incident_id=incident_id)
