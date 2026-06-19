"""
Agent service — bridges the FastAPI backend and the CrewAI orchestrator.
"""

import sys
import os
from pathlib import Path
from typing import Dict, Any

from app.db import mock_db


def run_crew(incident: Dict[str, Any]) -> Dict:
    """
    Run the 10-agent CrewAI pipeline for an incident.
    Imports the orchestrator from the sibling 'agents/' package.
    Falls back to a deterministic mock plan if the package is unavailable.
    """
    # Resolve path: backend/app/services → backend/app → backend → project root → agents
    agents_path = Path(__file__).resolve().parent.parent.parent.parent / "agents"

    if str(agents_path) not in sys.path:
        sys.path.insert(0, str(agents_path))

    try:
        from orchestrator import run_rescue_pipeline  # type: ignore
        result = run_rescue_pipeline(incident)
    except Exception:
        # Fallback: deterministic mock plan — always works with no API keys
        result = _build_mock_result(incident)

    # Persist the rescue plan
    mock_db.save_rescue_request(incident["id"], result["rescue_plan"])

    # Persist each agent decision
    for i, decision in enumerate(result.get("agent_decisions", [])):
        mock_db.save_agent_decision({
            "incident_id": incident["id"],
            "agent_name": decision["agent"],
            "output_data": {"output": decision["output"], "step": decision.get("step", i + 1)},
            "status": "mock",
        })

    return result


def _build_mock_result(incident: Dict) -> Dict:
    """
    Deterministic mock pipeline — runs all 10 agents symbolically.
    Returns a fully structured rescue plan with the new schema fields.
    """
    severity = incident.get("severity", 3)
    inc_type = incident.get("type", "other")
    location = incident.get("location", "Unknown location")

    # Derived values
    priority_map = {1: "P5", 2: "P4", 3: "P3", 4: "P2", 5: "P1"}
    priority = priority_map.get(severity, "P3")
    survivor_prob = round(min(0.95, 0.45 + severity * 0.10), 2)
    estimated_survivors = severity * 55
    priority_score = round(severity / 5, 2)
    confidence_score = round(0.70 + severity * 0.04, 2)
    medical_priority = "critical" if severity >= 4 else ("high" if severity == 3 else "medium")
    dispatch_urgency = "immediate" if severity >= 4 else "urgent"

    # Resource recommendations
    resources = [
        {"type": "ambulance", "count": severity * 2, "eta_minutes": 10 + severity},
        {"type": "rescue_team", "count": severity, "eta_minutes": 15 + severity},
    ]
    if severity >= 3:
        resources.append({"type": "helicopter", "count": 1, "eta_minutes": 22})
    if inc_type in ("flood", "cyclone"):
        resources.append({"type": "water_rescue", "count": severity, "eta_minutes": 18})
    if inc_type in ("fire", "industrial"):
        resources.append({"type": "fire_truck", "count": severity, "eta_minutes": 8})

    # Hospital routing
    hospitals = [
        {
            "name": "City General Hospital",
            "distance_km": 3.5,
            "available_beds": 80,
            "patient_routing": severity * 25,
        },
        {
            "name": "Regional Trauma Centre",
            "distance_km": 7.2,
            "available_beds": 55,
            "patient_routing": severity * 10,
        },
    ]

    rescue_plan = {
        "priority": priority,
        "severity": severity,
        "affected_area": location,
        "estimated_survivors": estimated_survivors,
        "survivor_probability": survivor_prob,
        "priority_score": priority_score,
        "confidence_score": confidence_score,
        "medical_priority": medical_priority,
        "dispatch_urgency": dispatch_urgency,
        "recommended_hospital": "City General Hospital",
        "recommended_resources": resources,
        "hospitals": hospitals,
        "alert_actions": {
            "field_team": (
                f"PRIORITY {priority}: All units deploy to {location} immediately. "
                f"Estimated {estimated_survivors} survivors. "
                f"Medical priority: {medical_priority.upper()}."
            ),
            "hospital": (
                f"MASS CASUALTY ALERT: Prepare for {severity * 35} incoming patients from {location}. "
                f"Activate {'CRITICAL' if severity >= 4 else 'HIGH'} MCI protocol now."
            ),
            "public": (
                f"EMERGENCY ALERT: Disaster response underway at {location}. "
                f"Avoid the area. Emergency services are on scene."
            ),
        },
        "risk_warnings": _build_risk_warnings(inc_type, severity),
    }

    # 10-agent decision log
    agent_decisions = [
        {"step": 1, "agent": "disaster_intelligence",
         "output": f"Classified: {inc_type.upper()}, Severity {severity}/5. Estimated impact radius {severity * 2} km."},
        {"step": 2, "agent": "incident_understanding",
         "output": f"Location normalised: {location}. Affected population ~{severity * 12000}. Infrastructure damage: {'severe' if severity >= 4 else 'moderate'}."},
        {"step": 3, "agent": "survivor_probability",
         "output": f"Survivor probability: {survivor_prob}. Estimated {estimated_survivors} people require rescue. Time-sensitivity: {'critical' if severity >= 4 else 'high'}."},
        {"step": 4, "agent": "medical_triage",
         "output": f"Medical priority: {medical_priority.upper()}. Trauma types: blunt force, respiratory. Deploy {severity * 2} medical units."},
        {"step": 5, "agent": "priority_agent",
         "output": f"Priority assigned: {priority}. Score: {priority_score}. Dispatch: {dispatch_urgency.upper()}. Response window: {max(30 - severity * 4, 5)} min."},
        {"step": 6, "agent": "resource_allocation",
         "output": f"Resources allocated: {severity * 2} ambulances, {severity} rescue teams" + (", 1 helicopter" if severity >= 3 else "") + f". Total units: {len(resources)}."},
        {"step": 7, "agent": "hospital_coordination",
         "output": f"Primary: City General Hospital ({severity * 25} patients). Secondary: Regional Trauma Centre ({severity * 10} patients)."},
        {"step": 8, "agent": "risk_prediction",
         "output": "; ".join(_build_risk_warnings(inc_type, severity))},
        {"step": 9, "agent": "communication_agent",
         "output": f"Alerts drafted. Field SMS ({priority}), Hospital MCI notice, Public advisory issued for {location}."},
        {"step": 10, "agent": "command_orchestrator",
         "output": f"RESCUE PLAN ASSEMBLED. Priority {priority}. Confidence: {confidence_score}. All units deploy to {location} NOW."},
    ]

    return {
        "incident_id": incident["id"],
        "status": "completed",
        "rescue_plan": rescue_plan,
        "agent_decisions": agent_decisions,
    }


def _build_risk_warnings(inc_type: str, severity: int) -> list:
    warnings = []
    base = {
        "flood": ["Secondary flooding escalation risk in next 6 hours", "Waterborne disease risk post-flood"],
        "earthquake": ["Aftershock probability >60% within 24 hours", "Structural collapse risk in damaged buildings"],
        "fire": ["Fire spread risk — wind direction unfavorable", "Chemical/gas explosion risk in adjacent structures"],
        "cyclone": ["Storm surge expected along coastline", "Continued wind damage risk for 12+ hours"],
        "landslide": ["Secondary slide risk — avoid disturbing slope", "Road blockage may delay reinforcements"],
        "industrial": ["Hazardous material exposure risk", "Evacuation zone may expand"],
    }
    type_warnings = base.get(inc_type, ["Monitor situation for secondary hazards"])
    warnings.extend(type_warnings)
    if severity >= 4:
        warnings.append("Mass casualty event — activate full MCI protocol")
    return warnings
