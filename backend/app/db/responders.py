"""
RescueNet AI — Responder Registry (In-Memory)
Stores registered first responders (ambulance drivers, fire teams, NDRF, etc.)
Replace with PostgreSQL table when DB is connected.
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


# ===========================
# In-memory store
# ===========================
_responders: Dict[str, Dict] = {}


# ===========================
# Seed a default demo responder
# ===========================
def _seed_demo_responder():
    demo = {
        "id": "resp-demo-001",
        "name": "Demo Responder (Ambulance)",
        "phone": "6304589007",
        "whatsapp": "whatsapp:+916304589007",
        "asset_types": ["ambulance"],
        "district": "Hyderabad",
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
    phone = data.get("phone", "").strip().replace(" ", "").replace("-", "")
    # Normalize to E.164 for India if 10 digits
    if phone.isdigit() and len(phone) == 10:
        whatsapp_num = f"whatsapp:+91{phone}"
    elif phone.startswith("+"):
        whatsapp_num = f"whatsapp:{phone}"
    else:
        whatsapp_num = f"whatsapp:+{phone}"

    record = {
        "id": resp_id,
        "name": data.get("name", "Unknown"),
        "phone": phone,
        "whatsapp": whatsapp_num,
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
