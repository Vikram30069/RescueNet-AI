"""
Agent service — bridges the FastAPI backend and the CrewAI orchestrator.
Handles the import, runs the crew, and structures the response.
"""

import sys
import os
from typing import Dict, Any

from app.db import mock_db


def run_crew(incident: Dict[str, Any]) -> Dict:
    """
    Run the 10-agent CrewAI pipeline for an incident.
    Imports the orchestrator from the agents package (sibling directory).
    Falls back to mock output if agents package is not available.
    """
    # Add agents directory to the Python path so it can be imported
    agents_path = os.path.join(os.path.dirname(__file__), "../../../../agents")
    agents_path = os.path.abspath(agents_path)

    if agents_path not in sys.path:
        sys.path.insert(0, agents_path)

    try:
        from orchestrator import run_rescue_pipeline
        result = run_rescue_pipeline(incident)
    except ImportError:
        # Fallback: return a structured mock plan if agents not available
        result = _mock_rescue_plan(incident)

    # Persist the rescue plan
    mock_db.save_rescue_request(incident["id"], result["rescue_plan"])

    # Persist agent decisions
    for decision in result.get("agent_decisions", []):
        mock_db.save_agent_decision({
            "incident_id": incident["id"],
            "agent_name": decision["agent"],
            "output_data": {"output": decision["output"]},
            "status": "mock",
        })

    return result


def _mock_rescue_plan(incident: Dict) -> Dict:
    """Returns a deterministic mock rescue plan for testing without an LLM."""
    severity = incident.get("severity", 3)
    priority = ["P5", "P4", "P3", "P2", "P1"][severity - 1]

    return {
        "incident_id": incident["id"],
        "status": "completed",
        "rescue_plan": {
            "priority": priority,
            "survivor_estimate": severity * 50,
            "survivor_probability": round(0.5 + (severity * 0.08), 2),
            "medical_priority": "critical" if severity >= 4 else "high",
            "dispatch_urgency": "immediate" if severity >= 4 else "urgent",
            "resources": [
                {"type": "ambulance", "count": severity * 2, "eta_minutes": 12},
                {"type": "rescue_team", "count": severity, "eta_minutes": 15},
                {"type": "helicopter", "count": 1 if severity >= 3 else 0, "eta_minutes": 20},
            ],
            "hospitals": [
                {
                    "name": "City General Hospital",
                    "distance_km": 3.5,
                    "available_beds": 80,
                    "patient_routing": severity * 30,
                },
                {
                    "name": "Regional Trauma Center",
                    "distance_km": 7.2,
                    "available_beds": 45,
                    "patient_routing": severity * 10,
                },
            ],
            "risk_warnings": [
                "Potential structural collapse risk in affected zone",
                "Monitor for secondary hazards over next 6 hours",
            ],
            "alert_messages": {
                "field_team": f"PRIORITY {priority}: Deploy all assigned units to {incident.get('location')}. Estimated {severity * 50} survivors.",
                "hospital": f"Prepare for incoming casualties from {incident.get('location')}. Medical priority: {'CRITICAL' if severity >= 4 else 'HIGH'}.",
                "public": f"Emergency alert: Rescue operations underway at {incident.get('location')}. Avoid the area.",
            },
        },
        "agent_decisions": [
            {"agent": "disaster_intelligence", "output": f"Classified as {incident.get('type')} severity {severity}"},
            {"agent": "incident_understanding", "output": f"Location: {incident.get('location')}, estimated impact zone 5km"},
            {"agent": "survivor_probability", "output": f"Survivor probability: {round(0.5 + severity * 0.08, 2)}, estimate: {severity * 50} people"},
            {"agent": "medical_triage", "output": f"Medical priority: {'critical' if severity >= 4 else 'high'}. Trauma type: mixed injuries"},
            {"agent": "priority_agent", "output": f"Assigned priority {priority}, immediate dispatch required"},
            {"agent": "resource_allocation", "output": f"Dispatching {severity * 2} ambulances, {severity} rescue teams"},
            {"agent": "hospital_coordination", "output": "Routing to City General and Regional Trauma Center"},
            {"agent": "risk_prediction", "output": "Secondary risk: structural collapse, 6h monitoring window"},
            {"agent": "communication_agent", "output": "Alert messages drafted for field team, hospital, and public"},
            {"agent": "command_orchestrator", "output": f"Rescue plan assembled. Priority {priority} — all units deploy NOW"},
        ],
    }
