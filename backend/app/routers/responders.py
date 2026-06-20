"""
RescueNet AI — First Responders Router
Endpoints for registering and managing on-call emergency responders.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.db import responders as responder_db

router = APIRouter()


# ===========================
# Schemas
# ===========================

class ResponderRegisterRequest(BaseModel):
    name: str
    phone: str
    asset_types: List[str]  # e.g. ["ambulance", "rescue_team"]
    district: Optional[str] = ""

class ResponderStatusUpdate(BaseModel):
    status: str  # "available" | "busy" | "offline"


# ===========================
# Endpoints
# ===========================

@router.post("/responders/register", status_code=201)
async def register_responder(payload: ResponderRegisterRequest):
    """
    Register a first responder (ambulance driver, fire team, NDRF, etc.).
    They will receive WhatsApp alerts when their asset type is dispatched.
    """
    record = responder_db.register_responder(payload.dict())
    return {
        "success": True,
        "message": (
            f"Responder '{record['name']}' registered for WhatsApp dispatch alerts on "
            f"{record['whatsapp']}. If using the Twilio Sandbox sender, this phone must join "
            "the sandbox before real delivery works."
        ),
        "responder": record,
    }


@router.get("/responders")
async def list_responders(asset_type: Optional[str] = None, district: Optional[str] = None):
    """List all registered first responders."""
    results = responder_db.list_responders(asset_type=asset_type, district=district)
    return {"responders": results, "total": len(results)}


@router.get("/responders/{responder_id}")
async def get_responder(responder_id: str):
    """Get a specific responder by ID."""
    record = responder_db.get_responder(responder_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Responder '{responder_id}' not found")
    return record


@router.patch("/responders/{responder_id}/status")
async def update_responder_status(responder_id: str, payload: ResponderStatusUpdate):
    """Update a responder's availability status."""
    valid_statuses = {"available", "busy", "offline"}
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {valid_statuses}")

    record = responder_db.update_status(responder_id, payload.status)
    if not record:
        raise HTTPException(status_code=404, detail=f"Responder '{responder_id}' not found")

    return {"success": True, "responder": record}
