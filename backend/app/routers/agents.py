"""Agents router — trigger CrewAI pipeline, retrieve decisions, and agent log."""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from app.schemas.schemas import (
    AgentExecuteRequest,
    AgentExecuteResponse,
    AgentLogResponse,
    AgentLogEntry,
)
from app.services import agent_service
from app.db import mock_db

router = APIRouter()


@router.post("/agents/execute", response_model=AgentExecuteResponse)
async def execute_agents(payload: AgentExecuteRequest):
    """
    Trigger the full 10-agent CrewAI pipeline for a given incident.
    Works in mock mode when no LLM API keys are configured.
    """
    incident = mock_db.get_incident(payload.incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident '{payload.incident_id}' not found")

    result = agent_service.run_crew(incident)
    return result


@router.get("/agents/decisions/{incident_id}")
async def get_decisions(incident_id: str):
    """Get all recorded agent decisions for a specific incident."""
    decisions = mock_db.get_agent_decisions(incident_id)
    return {"incident_id": incident_id, "decisions": decisions, "total": len(decisions)}


@router.get("/agent-log", response_model=AgentLogResponse)
async def get_agent_log(
    incident_id: Optional[str] = Query(None, description="Filter by incident ID"),
    limit: int = Query(50, ge=1, le=200),
):
    """
    Return recent agent decisions across all incidents.
    Optionally filter by incident_id.
    """
    if incident_id:
        raw = mock_db.get_agent_decisions(incident_id)
    else:
        raw = mock_db.get_all_agent_decisions(limit=limit)

    entries = []
    for d in raw[:limit]:
        entries.append(
            AgentLogEntry(
                id=d.get("id", ""),
                incident_id=d.get("incident_id"),
                agent_name=d.get("agent_name", ""),
                output_data=d.get("output_data", {}),
                status=d.get("status", "mock"),
                created_at=d.get("created_at", ""),
            )
        )
    return AgentLogResponse(decisions=entries, total=len(entries))
