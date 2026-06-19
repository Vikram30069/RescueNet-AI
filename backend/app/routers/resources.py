"""Resources router — query available emergency resources."""

from fastapi import APIRouter, Query
from typing import Optional

from app.schemas.schemas import ResourceListResponse
from app.db import mock_db

router = APIRouter()


@router.get("/resources", response_model=ResourceListResponse)
async def list_resources(
    type: Optional[str] = Query(None, description="ambulance | helicopter | rescue_team | fire_truck"),
    status: Optional[str] = Query(None, description="available | deployed | maintenance"),
):
    """List all emergency resources with optional filters."""
    resources = mock_db.list_resources(type=type, status=status)
    return ResourceListResponse(resources=resources)
