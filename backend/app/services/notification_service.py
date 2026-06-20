"""
RescueNet AI — Notification Service
Sends WhatsApp alerts to registered first responders via Twilio.
Gracefully degrades to console logging if Twilio credentials are not configured.
"""

import os
import logging
from pathlib import Path
from typing import Dict, List

from dotenv import load_dotenv

logger = logging.getLogger("rescuenet.notifications")

BACKEND_DIR = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_DIR.parent

load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(BACKEND_DIR / ".env", override=True)

# ===========================
# Twilio setup (optional)
# ===========================

_twilio_client = None
_twilio_from = None
_twilio_uses_sandbox = False

def _init_twilio():
    global _twilio_client, _twilio_from, _twilio_uses_sandbox
    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")
    _twilio_from = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")
    _twilio_uses_sandbox = _twilio_from == "whatsapp:+14155238886"

    if account_sid and auth_token and not account_sid.startswith("AC_REPLACE"):
        try:
            from twilio.rest import Client
            _twilio_client = Client(account_sid, auth_token)
            logger.info("Twilio WhatsApp client initialized.")
        except ImportError:
            logger.warning("twilio package not installed. Run: pip install twilio")
    else:
        logger.info("Twilio credentials not set — running in SIMULATION mode (console logs only).")

_init_twilio()


# ===========================
# Message Builder
# ===========================

def _build_dispatch_message(incident: Dict, rescue_plan: Dict, responder: Dict) -> str:
    asset_types = responder.get("asset_types", [])
    asset_label = " / ".join(t.replace("_", " ").title() for t in asset_types)

    priority = rescue_plan.get("priority", "P3")
    location = rescue_plan.get("affected_area", incident.get("location", "Unknown"))
    survivors = rescue_plan.get("estimated_survivors", "N/A")
    hospital = rescue_plan.get("recommended_hospital", "Nearest hospital")
    resources = rescue_plan.get("recommended_resources", [])
    urgency = rescue_plan.get("dispatch_urgency", "urgent").upper()
    risk_warnings = rescue_plan.get("risk_warnings", [])

    # Find ETA from resources
    eta = "TBD"
    for r in resources:
        for asset in asset_types:
            if asset.replace("_", "") in r.get("type", "").replace("_", ""):
                eta = f"{r.get('eta_minutes', '?')} min"
                break

    risk_text = ""
    if risk_warnings:
        risk_text = f"\n\n⚠ *Risk Alert:* {risk_warnings[0]}"

    msg = (
        f"[RESCUENET DISPATCH ALERT]\n"
        f"{'='*40}\n"
        f"Incident: {incident.get('title', 'Emergency')}\n"
        f"Location: {location}\n"
        f"Priority: {priority} - {urgency}\n"
        f"Survivors Est: {survivors}\n"
        f"{'='*40}\n"
        f"DISPATCHED AS: {asset_label}\n"
        f"Route to Hospital: {hospital}\n"
        f"ETA to scene: {eta}"
        f"{risk_text}\n"
        f"{'='*40}\n"
        f"Reply CONFIRM to acknowledge dispatch.\n"
        f"- RescueNet AI Command Center"
    )
    return msg


# ===========================
# Core Dispatch Function
# ===========================

def notify_responders(incident: Dict, rescue_plan: Dict) -> List[Dict]:
    """
    Find available first responders matching dispatch needs and send them WhatsApp alerts.
    Returns a list of notification results.
    """
    from app.db import responders as responder_db

    # Extract required resource types from the plan
    required_resources = rescue_plan.get("recommended_resources", [])
    required_types = list({r.get("type", "") for r in required_resources if r.get("type")})

    # Find district from incident location (simple heuristic)
    location = incident.get("location", "")
    district = None
    telangana_districts = [
        "hyderabad", "warangal", "rangareddy", "medchal", "sangareddy",
        "karimnagar", "nizamabad", "khammam", "nalgonda", "suryapet",
        "bhadradri", "mulugu", "kumuram bheem", "mancherial", "peddapalli",
        "jayashankar", "siddipet", "yadadri", "vikarabad", "mahabubnagar",
        "nagarkurnool", "wanaparthy", "gadwal", "kamareddy", "rajanna",
        "hanamkonda", "jangaon", "mahabubabad", "nirmal", "adilabad",
        "secunderabad", "begumpet", "uppal", "lb nagar", "medchal"
    ]
    # Also treat begumpet, secunderabad, uppal, gachibowli etc. as Hyderabad
    hyderabad_synonyms = ["begumpet", "secunderabad", "uppal", "lb nagar", "gachibowli",
                          "banjara hills", "jubilee hills", "mehdipatnam", "ameerpet",
                          "kukatpally", "hitech city", "madhapur", "hanamkonda"]
    loc_lower = location.lower()
    for syn in hyderabad_synonyms:
        if syn in loc_lower:
            district = "Hyderabad"
            break
    if district is None:
        for d in telangana_districts:
            if d in loc_lower:
                district = d.title()
                break

    matched_responders = responder_db.find_available_responders_for_dispatch(
        required_types=required_types,
        district=district,
    )

    notifications = []
    for responder in matched_responders:
        message = _build_dispatch_message(incident, rescue_plan, responder)
        result = _send_whatsapp(responder["whatsapp"], message, responder)
        notifications.append(result)
        logger.info(f"Notified responder: {responder['name']} ({responder['phone']})")

    if not matched_responders:
        logger.info(f"No available responders found for types: {required_types} in district: {district}")

    return notifications


def _send_whatsapp(to: str, message: str, responder: Dict) -> Dict:
    """Send a WhatsApp message. Falls back to simulation if Twilio not configured."""
    base_result = {
        "responder_id": responder.get("id"),
        "responder_name": responder.get("name"),
        "phone": responder.get("phone"),
        "to": to,
        "message_preview": message[:120] + "...",
    }

    if not to or not to.startswith("whatsapp:+"):
        logger.error(f"Invalid WhatsApp recipient address for responder {responder.get('id')}: {to}")
        return {
            **base_result,
            "status": "failed",
            "error": "Invalid WhatsApp recipient. Expected whatsapp:+<countrycode><number>.",
        }

    if _twilio_client and _twilio_from:
        try:
            msg = _twilio_client.messages.create(
                body=message,
                from_=_twilio_from,
                to=to,
            )
            status = getattr(msg, "status", None) or "queued"
            result = {
                **base_result,
                "status": status,
                "sid": msg.sid,
                "twilio_status": status,
                "twilio_error_code": getattr(msg, "error_code", None),
                "twilio_error_message": getattr(msg, "error_message", None),
            }
            if _twilio_uses_sandbox:
                result["delivery_note"] = (
                    "Twilio accepted the WhatsApp message. Sandbox recipients must first join "
                    "your Twilio WhatsApp Sandbox from their phone before messages are delivered."
                )
            logger.info(f"Twilio WhatsApp message created for {to}: sid={msg.sid}, status={status}")
            return result
        except Exception as e:
            logger.error(f"Twilio error for {to}: {e}")
            return {**base_result, "status": "failed", "error": str(e)}
    else:
        # Simulation mode — log to console
        logger.info(f"[WHATSAPP SIMULATION] To: {responder.get('name')} ({responder.get('phone')})")
        logger.info(f"[WHATSAPP SIMULATION] Preview: {message[:200]}")
        return {**base_result, "status": "simulated"}
