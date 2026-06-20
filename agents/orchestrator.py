"""
RescueNet AI — CrewAI Orchestrator
Main entry point for the multi-agent rescue pipeline.

PHASE B: Tasks are now built with full context chaining via build_task_chain().
PHASE C: Command Orchestrator receives context from all 9 prior tasks.
PHASE E: Structured logging for every agent step (task name, agent, timestamp,
          input summary, output summary, confidence).

Usage:
  from orchestrator import run_rescue_pipeline
  result = run_rescue_pipeline(incident_dict)

Or run standalone:
  python orchestrator.py
"""

import os
import json
import sys
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List

# ─── Logger setup ─────────────────────────────────────────────────────────────
logger = logging.getLogger("rescuenet.orchestrator")
if not logger.handlers:
    _handler = logging.StreamHandler(sys.stdout)
    _handler.setFormatter(logging.Formatter(
        "[%(asctime)s] [%(name)s] %(levelname)s — %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%SZ",
    ))
    logger.addHandler(_handler)
    logger.setLevel(logging.INFO)


# ─── Environment ──────────────────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))
except ImportError:
    pass

from config.llm_config import get_llm

# ─── Agent factories ──────────────────────────────────────────────────────────
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

# ─── Task builder (now uses build_task_chain with context=[]) ─────────────────
from tasks.tasks import build_task_chain


# ─── Agent name → step index map (for logging) ───────────────────────────────
_AGENT_ORDER = [
    "disaster_intelligence",
    "incident_understanding",
    "survivor_probability",
    "medical_triage",
    "priority_agent",
    "resource_allocation",
    "hospital_coordination",
    "risk_prediction",
    "communication_agent",
    "command_orchestrator",
]


def _log_agent_step(
    step: int,
    agent_name: str,
    task_name: str,
    input_summary: str,
    output_summary: str,
    confidence: float = 0.0,
) -> None:
    """Phase E: Structured per-agent logging."""
    logger.info(
        "\n"
        "  ┌─ Agent Step %d/10 ──────────────────────────────────────\n"
        "  │  Agent:      %s\n"
        "  │  Task:       %s\n"
        "  │  Timestamp:  %s\n"
        "  │  Input:      %s\n"
        "  │  Output:     %s\n"
        "  │  Confidence: %.2f\n"
        "  └────────────────────────────────────────────────────────",
        step,
        agent_name,
        task_name,
        datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        input_summary[:120],
        output_summary[:120],
        confidence,
    )


# ─── Public entry point ───────────────────────────────────────────────────────

def run_rescue_pipeline(incident: Dict[str, Any]) -> Dict:
    """
    Run the full 10-agent CrewAI rescue pipeline.

    When LLM_PROVIDER=mock, returns structured mock output without calling any LLM.
    When a real LLM is configured, each agent executes its task via the language model,
    with full context chaining so each agent receives prior agent outputs.

    Args:
        incident: dict containing incident data from the database

    Returns:
        dict with rescue_plan and agent_decisions list
    """
    llm = get_llm()
    is_mock = llm is None

    logger.info(
        "Starting rescue pipeline | Incident: %s | ID: %s | Mode: %s",
        incident.get("title"),
        incident.get("id"),
        "MOCK" if is_mock else "LIVE",
    )

    if is_mock:
        return _run_mock_pipeline(incident)

    return _run_live_pipeline(incident, llm)


# ─── Live pipeline (PHASE B/C) ────────────────────────────────────────────────

def _run_live_pipeline(incident: Dict, llm: Any) -> Dict:
    """
    Execute the real CrewAI crew with live LLM calls.

    PHASE B: Tasks are built via build_task_chain() which wires context=[].
    PHASE C: The final task receives context from ALL 9 prior tasks.
    PHASE E: Each agent step is logged with structured output.
    """
    from crewai import Crew, Process

    # Instantiate all 10 agents with the configured LLM
    agents = {
        "disaster_intelligence":  create_disaster_intelligence_agent(llm),
        "incident_understanding": create_incident_understanding_agent(llm),
        "survivor_probability":   create_survivor_probability_agent(llm),
        "medical_triage":         create_medical_triage_agent(llm),
        "priority_agent":         create_priority_agent(llm),
        "resource_allocation":    create_resource_allocation_agent(llm),
        "hospital_coordination":  create_hospital_coordination_agent(llm),
        "risk_prediction":        create_risk_prediction_agent(llm),
        "communication_agent":    create_communication_agent(llm),
        "command_orchestrator":   create_command_orchestrator_agent(llm),
    }

    # PHASE B: Build tasks with full context chaining
    logger.info("Building task chain with context propagation enabled.")
    tasks = build_task_chain(agents, incident)

    # PHASE B: Create crew with sequential process
    crew = Crew(
        agents=list(agents.values()),
        tasks=tasks,
        process=Process.sequential,
        verbose=True,
    )

    logger.info("Kicking off CrewAI crew (%d agents, %d tasks)…", len(agents), len(tasks))
    crew.kickoff()

    # PHASE E: Extract and log each task output
    agent_decisions = []
    for i, (name, task) in enumerate(zip(_AGENT_ORDER, tasks)):
        # CrewAI v0.55+ stores output in task.output.raw or task.output
        raw_output = _extract_task_output(task, i)
        confidence = _extract_confidence(raw_output)

        _log_agent_step(
            step=i + 1,
            agent_name=name,
            task_name=task.description[:60] + "…",
            input_summary=f"Incident {incident.get('id')} | severity {incident.get('severity')}",
            output_summary=raw_output[:120],
            confidence=confidence,
        )

        agent_decisions.append({
            "step":  i + 1,
            "agent": name,
            "output": raw_output,
        })

    # PHASE C: The final task output is the assembled rescue plan
    final_raw = _extract_task_output(tasks[-1], 9)
    rescue_plan = _parse_rescue_plan(final_raw, incident)

    logger.info(
        "Pipeline complete | Priority: %s | Survivors: %s",
        rescue_plan.get("priority", "?"),
        rescue_plan.get("estimated_survivors", "?"),
    )

    return {
        "incident_id":    incident["id"],
        "status":         "completed",
        "rescue_plan":    rescue_plan,
        "agent_decisions": agent_decisions,
    }


def _extract_task_output(task: Any, index: int) -> str:
    """
    Safely extract text output from a CrewAI task.
    Handles both old (task.output as str) and new (task.output.raw) API.
    """
    try:
        output = task.output
        if output is None:
            return f"Task {index + 1} produced no output."
        # CrewAI >= 0.55: output is a TaskOutput object with .raw attribute
        if hasattr(output, "raw"):
            return str(output.raw)
        # CrewAI < 0.55: output is a string directly
        return str(output)
    except Exception as exc:
        logger.warning("Could not extract output for task %d: %s", index + 1, exc)
        return f"Task {index + 1} output unavailable."


def _extract_confidence(output_text: str) -> float:
    """
    Parse the confidence value from a structured agent JSON output.
    Returns 0.0 if parsing fails.
    """
    try:
        start = output_text.find("{")
        end = output_text.rfind("}") + 1
        if start >= 0 and end > start:
            data = json.loads(output_text[start:end])
            return float(data.get("confidence", 0.0))
    except (json.JSONDecodeError, ValueError, TypeError):
        pass
    return 0.0


def _parse_rescue_plan(output: str, incident: Dict) -> Dict:
    """
    PHASE C: Parse the final Command Orchestrator output into a RescuePlan dict.

    Attempt 1: Parse the JSON block directly from the output.
    Attempt 2: Extract the outer JSON block if wrapped in prose.
    Fallback:  Use the mock pipeline to guarantee a valid plan (logs a warning).
    """
    # Attempt 1 & 2: find JSON block in output
    try:
        start = output.find("{")
        end = output.rfind("}") + 1
        if start >= 0 and end > start:
            plan = json.loads(output[start:end])
            # Validate required keys are present
            required = {
                "priority", "severity", "affected_area", "estimated_survivors",
                "survivor_probability", "priority_score", "confidence_score",
                "medical_priority", "dispatch_urgency", "recommended_hospital",
                "recommended_resources", "hospitals", "alert_actions", "risk_warnings",
            }
            if required.issubset(plan.keys()):
                logger.info("Rescue plan parsed successfully from LLM output.")
                return plan
            else:
                missing = required - plan.keys()
                logger.warning("Parsed plan missing keys: %s. Using fallback.", missing)
    except (json.JSONDecodeError, ValueError) as exc:
        logger.warning("JSON parse failed: %s. Using fallback.", exc)

    logger.warning("Could not parse LLM output as valid RescuePlan; using structured fallback.")
    return _run_mock_pipeline(incident)["rescue_plan"]


# ─── Mock pipeline (PHASE E logging added) ───────────────────────────────────

def _run_mock_pipeline(incident: Dict) -> Dict:
    """
    Deterministic mock pipeline — no LLM required.
    Simulates the full 10-agent context chain with realistic mock outputs.

    PHASE E: Each agent step is logged with structured information.

    Field names match backend RescuePlan Pydantic schema exactly:
      - estimated_survivors   (not survivor_estimate)
      - recommended_resources (not resources)
      - alert_actions         (not alert_messages)
    """
    severity = incident.get("severity", 3)
    priority_map = {1: "P5", 2: "P4", 3: "P3", 4: "P2", 5: "P1"}
    priority = priority_map.get(severity, "P3")
    inc_type  = incident.get("type", "other")
    location  = incident.get("location", "Unknown location")

    # ── Derived values (mirror agent_service._build_mock_result) ─────────────
    survivor_prob       = round(min(0.95, 0.45 + severity * 0.10), 2)
    estimated_survivors = severity * 55
    priority_score      = round(severity / 5, 2)
    confidence_score    = round(0.70 + severity * 0.04, 2)
    medical_priority    = "critical" if severity >= 4 else ("high" if severity == 3 else "medium")
    dispatch_urgency    = "immediate" if severity >= 4 else "urgent"

    # ── Resources ─────────────────────────────────────────────────────────────
    resources = [
        {"type": "ambulance",    "count": severity * 2, "eta_minutes": 10 + severity},
        {"type": "rescue_team",  "count": severity,     "eta_minutes": 15 + severity},
    ]
    if severity >= 3:
        resources.append({"type": "helicopter",  "count": 1,        "eta_minutes": 22})
    if inc_type in ("flood", "cyclone"):
        resources.append({"type": "water_rescue","count": severity,  "eta_minutes": 18})
    if inc_type in ("fire", "industrial"):
        resources.append({"type": "fire_truck",  "count": severity,  "eta_minutes": 8})

    # ── Hospital routing ──────────────────────────────────────────────────────
    hospitals = [
        {"name": "City General Hospital",   "distance_km": 3.5, "available_beds": 80,  "patient_routing": severity * 25},
        {"name": "Regional Trauma Centre",  "distance_km": 7.2, "available_beds": 55,  "patient_routing": severity * 10},
    ]

    # ── Risk warnings ─────────────────────────────────────────────────────────
    risk_warnings = _build_risk_warnings(inc_type, severity)

    # ── Agent decision log (simulates chained context flow) ──────────────────
    # Each step's output feeds into the next — documented in the output text
    step1_out = f"Classified: {inc_type.upper()}, Severity {severity}/5. Impact radius: {severity * 2}km. Threat: life-threatening."
    step2_out = f"Location normalised: {location}. Affected pop: ~{severity * 12000}. Damage: {'severe' if severity >= 4 else 'moderate'}. [Uses: step 1 classification]"
    step3_out = f"Survivor probability: {survivor_prob}. Estimated {estimated_survivors} require rescue. Time-sensitivity: {'critical' if severity >= 4 else 'high'}. [Uses: step 2 population]"
    step4_out = f"Medical priority: {medical_priority.upper()}. Trauma: blunt force, respiratory. Deploy {severity * 2} medical units. [Uses: step 3 survivor count]"
    step5_out = f"Priority: {priority}. Score: {priority_score}. Dispatch: {dispatch_urgency.upper()}. Window: {max(30 - severity * 4, 5)} min. [Uses: steps 1-4]"
    step6_out = f"Dispatching {severity * 2} ambulances, {severity} rescue teams" + (", 1 helicopter" if severity >= 3 else "") + f". Total: {len(resources)} unit types. [Uses: steps 4,5]"
    step7_out = f"Primary: City General Hospital ({severity * 25} patients, 3.5km). Secondary: Regional Trauma Centre ({severity * 10} patients, 7.2km). [Uses: steps 3,4,5]"
    step8_out = "; ".join(risk_warnings) + " [Uses: steps 1,2]"
    step9_out = f"Alerts drafted — Field SMS ({priority} dispatch to {location}), Hospital MCI notice (prepare {severity * 35} beds), Public advisory. [Uses: steps 5,6,7,8]"
    step10_out = (
        f"RESCUE PLAN ASSEMBLED from all 9 prior agents. "
        f"Priority {priority} | Confidence {confidence_score} | "
        f"Survivors: {estimated_survivors} | Medical: {medical_priority.upper()} | "
        f"Resources: {len(resources)} types | Hospitals: {len(hospitals)} assigned. "
        f"[Synthesised from steps 1-9]"
    )

    # ── Phase E logging ───────────────────────────────────────────────────────
    steps = [
        (1,  "disaster_intelligence",  "classify_incident_task",      f"incident={incident.get('id')}", step1_out,  0.90),
        (2,  "incident_understanding", "understand_incident_task",     step1_out[:60],                  step2_out,  0.87),
        (3,  "survivor_probability",   "estimate_survivors_task",      step2_out[:60],                  step3_out,  0.85),
        (4,  "medical_triage",         "medical_triage_task",          step3_out[:60],                  step4_out,  0.88),
        (5,  "priority_agent",         "prioritize_incident_task",     step4_out[:60],                  step5_out,  0.92),
        (6,  "resource_allocation",    "allocate_resources_task",      step5_out[:60],                  step6_out,  0.86),
        (7,  "hospital_coordination",  "coordinate_hospitals_task",    step3_out[:60],                  step7_out,  0.84),
        (8,  "risk_prediction",        "predict_risks_task",           step2_out[:60],                  step8_out,  0.80),
        (9,  "communication_agent",    "draft_alerts_task",            step5_out[:60],                  step9_out,  0.89),
        (10, "command_orchestrator",   "assemble_rescue_plan_task",    "all prior outputs",             step10_out, confidence_score),
    ]

    for step, agent, task_name, inp, out, conf in steps:
        _log_agent_step(
            step=step, agent_name=agent, task_name=task_name,
            input_summary=inp, output_summary=out, confidence=conf,
        )

    agent_decisions = [
        {"step": s, "agent": a, "output": o}
        for s, a, _, _, o, _ in steps
    ]

    # ── Rescue plan (field names match RescuePlan Pydantic schema exactly) ────
    rescue_plan = {
        "priority":              priority,
        "severity":              severity,
        "affected_area":         location,
        "estimated_survivors":   estimated_survivors,        # ← correct key
        "survivor_probability":  survivor_prob,
        "priority_score":        priority_score,
        "confidence_score":      confidence_score,
        "medical_priority":      medical_priority,
        "dispatch_urgency":      dispatch_urgency,
        "recommended_hospital":  "City General Hospital",
        "recommended_resources": resources,                  # ← correct key
        "hospitals":             hospitals,
        "alert_actions": {                                   # ← correct key
            "field_team": (
                f"PRIORITY {priority}: All units deploy to {location} immediately. "
                f"Estimated {estimated_survivors} survivors. "
                f"Medical priority: {medical_priority.upper()}."
            ),
            "hospital": (
                f"MASS CASUALTY ALERT: Prepare for {severity * 35} incoming patients from {location}. "
                f"Trauma: blunt force, respiratory. Activate {'CRITICAL' if severity >= 4 else 'HIGH'} MCI protocol."
            ),
            "public": (
                f"EMERGENCY ALERT: Disaster response underway at {location}. "
                f"Avoid the area. Emergency services are on scene."
            ),
        },
        "risk_warnings": risk_warnings,
    }

    return {
        "incident_id":    incident["id"],
        "status":         "completed",
        "rescue_plan":    rescue_plan,
        "agent_decisions": agent_decisions,
    }


def _build_risk_warnings(inc_type: str, severity: int) -> list:
    """Build incident-type-specific risk warnings."""
    base = {
        "flood":      ["Secondary flooding escalation risk in next 6 hours", "Waterborne disease risk post-flood"],
        "earthquake": ["Aftershock probability >60% within 24 hours", "Structural collapse risk in damaged buildings"],
        "fire":       ["Fire spread risk — wind direction unfavorable", "Chemical/gas explosion risk in adjacent structures"],
        "cyclone":    ["Storm surge expected along coastline", "Continued wind damage risk for 12+ hours"],
        "landslide":  ["Secondary slide risk — avoid disturbing slope", "Road blockage may delay reinforcements"],
        "industrial": ["Hazardous material exposure risk", "Evacuation zone may expand"],
    }
    warnings = list(base.get(inc_type, ["Monitor situation for secondary hazards"]))
    if severity >= 4:
        warnings.append("Mass casualty event — activate full MCI protocol")
    return warnings


# ─── Standalone test ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    demo_incident = {
        "id":          "demo-001",
        "title":       "Major Flooding in South Mumbai",
        "type":        "flood",
        "description": "Severe flooding after 3-day monsoon. Multiple residential areas submerged.",
        "location":    "South Mumbai, Maharashtra",
        "latitude":    18.922,
        "longitude":   72.8347,
        "severity":    4,
        "status":      "reported",
    }

    result = run_rescue_pipeline(demo_incident)
    print("\n" + "=" * 60)
    print("RESCUE PLAN OUTPUT:")
    print("=" * 60)
    print(json.dumps(result, indent=2))
