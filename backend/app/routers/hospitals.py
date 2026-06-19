"""Hospitals router — search and retrieve hospital capacity data."""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from app.schemas.schemas import HospitalListResponse, HospitalResponse
from app.db import mock_db

router = APIRouter()


@router.get("/hospitals", response_model=HospitalListResponse)
async def list_hospitals(
    city: Optional[str] = Query(None, description="Filter by city"),
    min_beds: Optional[int] = Query(None, description="Minimum available beds"),
    specialization: Optional[str] = Query(None, description="e.g. trauma, burns"),
):
    """List hospitals with optional filters for city, capacity, and specialization."""
    hospitals = mock_db.list_hospitals(
        city=city, min_beds=min_beds, specialization=specialization
    )
    return HospitalListResponse(hospitals=hospitals)


@router.get("/hospitals/{hospital_id}", response_model=HospitalResponse)
async def get_hospital(hospital_id: str):
    """Get a specific hospital by ID."""
    hospital = mock_db.get_hospital(hospital_id)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return hospital


@router.get("/rescue-plan/{incident_id}")
async def get_rescue_plan(incident_id: str):
    """Get the generated rescue plan for an incident."""
    plan = mock_db.get_rescue_request(incident_id)
    if not plan:
        raise HTTPException(
            status_code=404,
            detail="No rescue plan found. Run /agents/execute first."
        )
    return plan
