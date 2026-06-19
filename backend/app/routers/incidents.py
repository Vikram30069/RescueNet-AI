"""Incidents router — submit and retrieve disaster incidents."""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from app.schemas.schemas import IncidentCreate, IncidentResponse, IncidentListResponse
from app.services import incident_service

router = APIRouter()


@router.post("/incidents", response_model=IncidentResponse, status_code=201)
async def create_incident(payload: IncidentCreate):
    """Submit a new disaster incident report."""
    return incident_service.create(payload)


@router.get("/incidents", response_model=IncidentListResponse)
async def list_incidents(
    status: Optional[str] = Query(None, description="Filter by status"),
    type: Optional[str] = Query(None, description="Filter by incident type"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """List all incidents with optional filtering and pagination."""
    return incident_service.list_all(status=status, type=type, limit=limit, offset=offset)


@router.get("/incidents/{incident_id}", response_model=IncidentResponse)
async def get_incident(incident_id: str):
    """Get a single incident by ID."""
    incident = incident_service.get_by_id(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident
