"""Incident service — business logic for incident management."""

from typing import Optional
from app.schemas.schemas import IncidentCreate, IncidentResponse, IncidentListResponse
from app.db import mock_db


def create(payload: IncidentCreate) -> IncidentResponse:
    """Create a new incident record."""
    data = payload.model_dump()
    record = mock_db.create_incident(data)
    return IncidentResponse(**record)


def get_by_id(incident_id: str) -> Optional[IncidentResponse]:
    """Retrieve a single incident by ID."""
    record = mock_db.get_incident(incident_id)
    if not record:
        return None
    return IncidentResponse(**record)


def list_all(
    status: Optional[str],
    type: Optional[str],
    limit: int,
    offset: int,
) -> IncidentListResponse:
    """List incidents with filters and pagination."""
    incidents = mock_db.list_incidents(status=status, type=type, limit=limit, offset=offset)
    total = mock_db.count_incidents()
    return IncidentListResponse(
        incidents=[IncidentResponse(**i) for i in incidents],
        total=total,
        limit=limit,
        offset=offset,
    )
