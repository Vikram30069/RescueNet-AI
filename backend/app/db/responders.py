"""
RescueNet AI — Responder Registry (In-Memory)
Stores registered first responders (ambulance drivers, fire teams, NDRF, etc.)
Replace with PostgreSQL table when DB is connected.
"""

import re
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


# ===========================
# In-memory store
# ===========================
_responders: Dict[str, Dict] = {}


def normalize_india_whatsapp(phone: str) -> Dict[str, str]:
    """Normalize local responder phone input to Twilio WhatsApp E.164 format."""
    raw_phone = (phone or "").strip()
    cleaned = re.sub(r"[\s\-().]", "", raw_phone)

    if cleaned.startswith("whatsapp:"):
        cleaned = cleaned.replace("whatsapp:", "", 1)

    if cleaned.startswith("00"):
        cleaned = f"+{cleaned[2:]}"

    digits_only = re.sub(r"\D", "", cleaned)
    if cleaned.startswith("+"):
        e164 = cleaned
        display_phone = cleaned
    elif digits_only.startswith("91") and len(digits_only) == 12:
        e164 = f"+{digits_only}"
        display_phone = digits_only[-10:]
    elif len(digits_only) == 10:
        e164 = f"+91{digits_only}"
        display_phone = digits_only
    else:
        e164 = f"+{digits_only}" if digits_only else ""
        display_phone = digits_only or raw_phone

    return {
        "phone": display_phone,
        "e164": e164,
        "whatsapp": f"whatsapp:{e164}" if e164 else "",
    }


# ===========================
# Seed a default demo responder
# ===========================
def _seed_demo_responder():
    demo = {
        "id": "resp-demo-001",
        "name": "Demo Responder (All-Rounder)",
        "phone": "6304589007",
        "whatsapp": "whatsapp:+916304589007",
        "asset_types": ["ambulance", "fire_truck", "ndrf_team", "medical_helicopter", "police", "search_and_rescue"],
        "district": "",  # Empty district matches all locations
        "status": "available",
        "registered_at": _now(),
    }
    _responders[demo["id"]] = demo

_seed_demo_responder()


# ===========================
# CRUD
# ===========================

def register_responder(data: Dict) -> Dict:
    resp_id = str(uuid.uuid4())
    phone_info = normalize_india_whatsapp(data.get("phone", ""))

    record = {
        "id": resp_id,
        "name": data.get("name", "Unknown"),
        "phone": phone_info["phone"],
        "whatsapp": phone_info["whatsapp"],
        "asset_types": data.get("asset_types", []),
        "district": data.get("district", ""),
        "status": "available",
        "registered_at": _now(),
    }
    _responders[resp_id] = record
    return record


def list_responders(asset_type: Optional[str] = None, district: Optional[str] = None) -> List[Dict]:
    results = list(_responders.values())
    if asset_type:
        results = [r for r in results if asset_type in r.get("asset_types", [])]
    if district:
        results = [r for r in results if r.get("district", "").lower() == district.lower()]
    return results


def get_responder(resp_id: str) -> Optional[Dict]:
    return _responders.get(resp_id)


def update_status(resp_id: str, status: str) -> Optional[Dict]:
    if resp_id in _responders:
        _responders[resp_id]["status"] = status
        return _responders[resp_id]
    return None


def find_available_responders_for_dispatch(required_types: List[str], district: Optional[str] = None) -> List[Dict]:
    """
    Find available responders whose asset_types overlap with the required dispatch types.
    Used by the notification service to know who to alert.
    """
    results = []
    for r in _responders.values():
        if r.get("status") != "available":
            continue
        if district and r.get("district", "").lower() not in ("", district.lower()):
            continue
        # Check if this responder covers any of the required types
        if any(t in r.get("asset_types", []) for t in required_types):
            results.append(r)
    return results
