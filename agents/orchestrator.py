"""
RescueNet AI — CrewAI Orchestrator
Main entry point for the multi-agent rescue pipeline.

Usage:
  from orchestrator import run_rescue_pipeline
  result = run_rescue_pipeline(incident_dict)

Or run standalone:
  python orchestrator.py
"""

import os
import json
import sys
from typing import Dict, Any

# Load environment variables if running standalone
try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))
except ImportError:
    pass

from config.llm_config import get_llm

# Import all agent factories
from definitions.disaster_intelligence import create_disaster_intelligence_agent
from definitions.incident_understanding import create_incident_understanding_agent
from definitions.survivor_probability import create_survivor_probability_agent
from definitions.medical_triage import create_medical_triage_agent
from definitions.priority_agent import create_priority_agent
from definitions.resource_allocation import create_resource_allocation_agent
from definitions.hospital_coordination import create_hospital_coordination_agent
from definitions.communication_agent import create_communication_agent
from definitions.risk_prediction import create_risk_prediction_agent
from definitions.command_orchestrator import create_command_orchestrator_agent

# Import all task builders
from tasks.tasks import (
    classify_incident_task,
    understand_incident_task,
    estimate_survivors_task,
    medical_triage_task,
    prioritize_incident_task,
    allocate_resources_task,
    coordinate_hospitals_task,
    predict_risks_task,
    draft_alerts_task,
    assemble_rescue_plan_task,
)


def run_rescue_pipeline(incident: Dict[str, Any]) -> Dict:
    """
    Run the full 10-agent CrewAI rescue pipeline.

    When LLM_PROVIDER=mock, returns structured mock output without calling any LLM.
    When a real LLM is configured, each agent executes its task via the language model.

    Args:
        incident: dict containing incident data from the database

    Returns:
        dict with rescue_plan and agent_decisions list
    """
    llm = get_llm()
    is_mock = llm is None

    print(f"\n[Orchestrator] Starting rescue pipeline for: {incident.get('title')}")
    print(f"[Orchestrator] LLM mode: {'MOCK (no LLM)' if is_mock else 'LIVE'}")
    print(f"[Orchestrator] Incident ID: {incident.get('id')}")

    if is_mock:
        return _run_mock_pipeline(incident)

    return _run_live_pipeline(incident, llm)


def _run_live_pipeline(incident: Dict, llm: Any) -> Dict:
    """Execute the real CrewAI crew with live LLM calls."""
    from crewai import Crew, Process

    # Instantiate all agents with the configured LLM
    agents = {
        "disaster_intelligence": create_disaster_intelligence_agent(llm),
        "incident_understanding": create_incident_understanding_agent(llm),
        "survivor_probability": create_survivor_probability_agent(llm),
        "medical_triage": create_medical_triage_agent(llm),
        "priority_agent": create_priority_agent(llm),
        "resource_allocation": create_resource_allocation_agent(llm),
        "hospital_coordination": create_hospital_coordination_agent(llm),
        "risk_prediction": create_risk_prediction_agent(llm),
        "communication_agent": create_communication_agent(llm),
        "command_orchestrator": create_command_orchestrator_agent(llm),
    }

    # Build tasks in execution order
    tasks = [
        classify_incident_task(agents["disaster_intelligence"], incident),
        understand_incident_task(agents["incident_understanding"], incident),
        estimate_survivors_task(agents["survivor_probability"], incident),
        medical_triage_task(agents["medical_triage"], incident),
        prioritize_incident_task(agents["priority_agent"], incident),
        allocate_resources_task(agents["resource_allocation"], incident),
        coordinate_hospitals_task(agents["hospital_coordination"], incident),
        predict_risks_task(agents["risk_prediction"], incident),
        draft_alerts_task(agents["communication_agent"], incident),
        assemble_rescue_plan_task(agents["command_orchestrator"], incident),
    ]

    # Create and run the crew
    crew = Crew(
        agents=list(agents.values()),
        tasks=tasks,
        process=Process.sequential,
        verbose=True,
    )

    print("[Orchestrator] Kicking off crew...")
    crew_output = crew.kickoff()

    # Parse the final task output (Command Orchestrator's rescue plan)
    final_output = str(crew_output)

    # Build structured response with individual task outputs
    agent_decisions = []
    for i, (name, task) in enumerate(zip(agents.keys(), tasks)):
        agent_decisions.append({
            "agent": name,
            "output": str(task.output) if hasattr(task, "output") else f"Task {i+1} completed",
        })

    return {
        "incident_id": incident["id"],
        "status": "completed",
        "rescue_plan": _parse_or_fallback(final_output, incident),
        "agent_decisions": agent_decisions,
    }


def _run_mock_pipeline(incident: Dict) -> Dict:
    """
    Deterministic mock pipeline — no LLM required.
    Simulates the full 10-agent flow with realistic mock outputs.
    """
    severity = incident.get("severity", 3)
    priority_map = {1: "P5", 2: "P4", 3: "P3", 4: "P2", 5: "P1"}
    priority = priority_map.get(severity, "P3")
    inc_type = incident.get("type", "other")
    location = incident.get("location", "Unknown location")

    agent_decisions = [
        {
            "agent": "disaster_intelligence",
            "output": f"Classified as {inc_type.upper()}, severity {severity}/5. Estimated impact radius: {severity * 2}km.",
        },
        {
            "agent": "incident_understanding",
            "output": f"Location: {location}. Estimated affected population: {severity * 10000}. Infrastructure damage: {'severe' if severity >= 4 else 'moderate'}.",
        },
        {
            "agent": "survivor_probability",
            "output": f"Survivor probability: {round(0.5 + severity * 0.08, 2)}. Estimated survivors needing rescue: {severity * 50}. Time-sensitivity: {'critical' if severity >= 4 else 'high'}.",
        },
        {
            "agent": "medical_triage",
            "output": f"Medical priority: {'CRITICAL' if severity >= 4 else 'HIGH'}. Trauma types: blunt force, respiratory, hypothermia. Deploy {severity * 2} medical units.",
        },
        {
            "agent": "priority_agent",
            "output": f"Priority assigned: {priority}. Dispatch urgency: {'IMMEDIATE' if severity >= 4 else 'URGENT'}. Response window: {max(30 - severity * 5, 5)} minutes.",
        },
        {
            "agent": "resource_allocation",
            "output": f"Dispatching: {severity * 2} ambulances (ETA 12min), {severity} rescue teams (ETA 15min), {1 if severity >= 3 else 0} helicopter (ETA 20min).",
        },
        {
            "agent": "hospital_coordination",
            "output": f"Routing to: City General Hospital ({severity * 30} patients, 3.5km away), Regional Trauma Center ({severity * 10} patients, 7.2km away).",
        },
        {
            "agent": "risk_prediction",
            "output": f"Secondary risks: structural collapse (high if {inc_type}), secondary flooding in 6h, hazmat exposure possible. Monitor 24h.",
        },
        {
            "agent": "communication_agent",
            "output": f"Alerts drafted: Field team SMS ({priority} dispatch), Hospital notice (prepare {severity * 40} beds), Public advisory (avoid {location}).",
        },
        {
            "agent": "command_orchestrator",
            "output": f"RESCUE PLAN ASSEMBLED. Priority {priority}. All units deploy to {location} NOW. Incident ID: {incident.get('id')}.",
        },
    ]

    rescue_plan = {
        "priority": priority,
        "survivor_estimate": severity * 50,
        "survivor_probability": round(0.5 + severity * 0.08, 2),
        "medical_priority": "critical" if severity >= 4 else "high",
        "dispatch_urgency": "immediate" if severity >= 4 else "urgent",
        "resources": [
            {"type": "ambulance", "count": severity * 2, "eta_minutes": 12},
            {"type": "rescue_team", "count": severity, "eta_minutes": 15},
            {"type": "helicopter", "count": 1 if severity >= 3 else 0, "eta_minutes": 20},
            {"type": "medical_unit", "count": severity, "eta_minutes": 18},
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
            f"Structural collapse risk elevated for {inc_type} incidents",
            "Secondary flooding/hazard risk in next 6 hours",
            "Monitor evacuation routes for secondary blockage",
        ],
        "alert_messages": {
            "field_team": f"PRIORITY {priority} DISPATCH: All units report to {location} immediately. Estimated {severity * 50} survivors. Medical priority: {'CRITICAL' if severity >= 4 else 'HIGH'}.",
            "hospital": f"MASS CASUALTY ALERT: Prepare for {severity * 40} incoming patients from {location}. Trauma types: blunt force, respiratory. Activate MCI protocol.",
            "public": f"EMERGENCY ALERT: Disaster response underway at {location}. Please avoid the area. Emergency services are on scene.",
        },
    }

    return {
        "incident_id": incident["id"],
        "status": "completed",
        "rescue_plan": rescue_plan,
        "agent_decisions": agent_decisions,
    }


def _parse_or_fallback(output: str, incident: Dict) -> Dict:
    """Try to parse JSON from LLM output, fall back to mock plan if parsing fails."""
    try:
        # Attempt to extract JSON from the output string
        start = output.find("{")
        end = output.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(output[start:end])
    except (json.JSONDecodeError, ValueError):
        pass

    # Fallback to mock plan structure
    print("[Orchestrator] Could not parse LLM output as JSON; using structured fallback.")
    return _run_mock_pipeline(incident)["rescue_plan"]


# --- Standalone test entry point ---
if __name__ == "__main__":
    demo_incident = {
        "id": "demo-001",
        "title": "Major Flooding in South Mumbai",
        "type": "flood",
        "description": "Severe flooding after 3-day monsoon. Multiple residential areas submerged.",
        "location": "South Mumbai, Maharashtra",
        "latitude": 18.922,
        "longitude": 72.8347,
        "severity": 4,
        "status": "reported",
    }

    result = run_rescue_pipeline(demo_incident)
    print("\n" + "="*60)
    print("RESCUE PLAN OUTPUT:")
    print("="*60)
    print(json.dumps(result, indent=2))
