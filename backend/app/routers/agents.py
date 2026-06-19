"""Agents router — trigger CrewAI pipeline and retrieve decisions."""

from fastapi import APIRouter, HTTPException

from app.schemas.schemas import AgentExecuteRequest, AgentExecuteResponse
from app.services import agent_service
from app.db import mock_db

router = APIRouter()


@router.post("/agents/execute", response_model=AgentExecuteResponse)
async def execute_agents(payload: AgentExecuteRequest):
    """
    Trigger the full 10-agent CrewAI pipeline for a given incident.
    Returns the rescue plan and a log of agent decisions.
    """
    incident = mock_db.get_incident(payload.incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    result = agent_service.run_crew(incident)
    return result


@router.get("/agents/decisions/{incident_id}")
async def get_decisions(incident_id: str):
    """Get all recorded agent decisions for an incident."""
    decisions = mock_db.get_agent_decisions(incident_id)
    return {"incident_id": incident_id, "decisions": decisions}
