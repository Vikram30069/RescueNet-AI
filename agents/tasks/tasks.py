"""
RescueNet AI — Task Definitions
One Task per agent in the CrewAI pipeline.

PHASE B: Each task now receives context from its upstream tasks.
PHASE D: All tasks specify structured output format via expected_output.

Task dependency chain:
  task_1 (classify)
    → task_2 (understand, context=[task_1])
      → task_3 (survivor, context=[task_2])
        → task_4 (medical, context=[task_3])
          → task_5 (priority, context=[task_1,task_2,task_3,task_4])
            → task_6 (resources, context=[task_4,task_5])
              → task_7 (hospitals, context=[task_3,task_4,task_5])
                → task_8 (risks, context=[task_1,task_2])
                  → task_9 (comms, context=[task_5,task_6,task_7,task_8])
                    → task_10 (orchestrate, context=[ALL])
"""

from crewai import Task
from typing import Any, List

# ─── Shared structured output format ─────────────────────────────────────────
#
# Each agent must return a JSON block matching:
# {
#   "agent_name": "<role>",
#   "summary": "<one-sentence summary of findings>",
#   "confidence": <float 0.0-1.0>,
#   "recommendations": ["<action 1>", "<action 2>", ...]
# }
#
# The final task (task_10) additionally returns the full rescue plan.
# ──────────────────────────────────────────────────────────────────────────────

_STRUCTURED_OUTPUT_INSTRUCTIONS = """\

IMPORTANT — Output Format:
Respond with a JSON block in this exact format:
{
  "agent_name": "<your role>",
  "summary": "<one-sentence summary of your key finding>",
  "confidence": <float between 0.0 and 1.0>,
  "recommendations": ["<specific action 1>", "<specific action 2>"]
}
"""


def build_task_chain(agents: dict, incident: dict) -> List[Task]:
    """
    Build all 10 tasks with full context chaining.

    Args:
        agents: dict keyed by agent name from orchestrator
        incident: the incident dict

    Returns:
        Ordered list of Task objects with context relationships wired.
    """
    t1 = classify_incident_task(agents["disaster_intelligence"], incident)
    t2 = understand_incident_task(agents["incident_understanding"], incident, context=[t1])
    t3 = estimate_survivors_task(agents["survivor_probability"], incident, context=[t2])
    t4 = medical_triage_task(agents["medical_triage"], incident, context=[t3])
    t5 = prioritize_incident_task(agents["priority_agent"], incident, context=[t1, t2, t3, t4])
    t6 = allocate_resources_task(agents["resource_allocation"], incident, context=[t4, t5])
    t7 = coordinate_hospitals_task(agents["hospital_coordination"], incident, context=[t3, t4, t5])
    t8 = predict_risks_task(agents["risk_prediction"], incident, context=[t1, t2])
    t9 = draft_alerts_task(agents["communication_agent"], incident, context=[t5, t6, t7, t8])
    t10 = assemble_rescue_plan_task(
        agents["command_orchestrator"], incident,
        context=[t1, t2, t3, t4, t5, t6, t7, t8, t9],
    )
    return [t1, t2, t3, t4, t5, t6, t7, t8, t9, t10]


# ─── Individual task factories ────────────────────────────────────────────────


def classify_incident_task(agent: Any, incident: dict, context: list = None) -> Task:
    """
    Task 1 — Disaster Intelligence Agent
    No upstream context. Sets the stage for all downstream agents.
    """
    return Task(
        description=(
            f"Analyze this incident report and produce a precise classification:\n"
            f"  Title:       {incident.get('title')}\n"
            f"  Type:        {incident.get('type')}\n"
            f"  Location:    {incident.get('location')}\n"
            f"  Description: {incident.get('description', 'N/A')}\n"
            f"  Reported Severity: {incident.get('severity')}/5\n\n"
            f"Determine:\n"
            f"  1. Confirmed disaster type (may differ from reported)\n"
            f"  2. Validated severity band (1–5)\n"
            f"  3. Estimated impact radius in km\n"
            f"  4. Threat category (life-threatening / infrastructure / environmental)\n"
            + _STRUCTURED_OUTPUT_INSTRUCTIONS
        ),
        expected_output=(
            'JSON: {"agent_name": "Disaster Intelligence Analyst", '
            '"summary": "...", "confidence": 0.0-1.0, '
            '"recommendations": ["Validated type: <type>", '
            '"Severity: <n>/5", "Impact radius: <n>km", "Threat: <category>"]}'
        ),
        agent=agent,
        context=context or [],
    )


def understand_incident_task(agent: Any, incident: dict, context: list = None) -> Task:
    """
    Task 2 — Incident Understanding Agent
    Receives: Task 1 classification output.
    Builds the normalized incident object for all downstream agents.
    """
    return Task(
        description=(
            f"Using the disaster classification from the previous agent, parse and "
            f"normalize this incident into a structured data object:\n"
            f"  Location:    {incident.get('location')}\n"
            f"  Coordinates: lat={incident.get('latitude')}, lon={incident.get('longitude')}\n"
            f"  Type:        {incident.get('type')}\n"
            f"  Severity:    {incident.get('severity')}\n\n"
            f"Produce:\n"
            f"  1. Verified coordinates\n"
            f"  2. Estimated affected population count\n"
            f"  3. Infrastructure damage assessment (none/minor/moderate/severe/catastrophic)\n"
            f"  4. Administrative area (district/city level)\n"
            + _STRUCTURED_OUTPUT_INSTRUCTIONS
        ),
        expected_output=(
            'JSON: {"agent_name": "Incident Comprehension Specialist", '
            '"summary": "...", "confidence": 0.0-1.0, '
            '"recommendations": ["Population affected: <n>", '
            '"Damage level: <level>", "Admin area: <area>"]}'
        ),
        agent=agent,
        context=context or [],
    )


def estimate_survivors_task(agent: Any, incident: dict, context: list = None) -> Task:
    """
    Task 3 — Survivor Probability Agent
    Receives: Task 2 normalized incident data (population estimate).
    """
    return Task(
        description=(
            f"Using the normalized incident data from the previous agent, estimate "
            f"survivor probability for:\n"
            f"  Type:     {incident.get('type')}\n"
            f"  Location: {incident.get('location')}\n"
            f"  Severity: {incident.get('severity')}/5\n\n"
            f"Apply historical disaster survival rates, structural vulnerability "
            f"factors, and population density context provided by the prior agent.\n\n"
            f"Calculate:\n"
            f"  1. Survivor probability (0.0 to 1.0)\n"
            f"  2. Estimated survivor count needing rescue\n"
            f"  3. Time-sensitivity rating (critical/high/medium/low)\n"
            f"  4. Rescue window (hours until probability degrades significantly)\n"
            + _STRUCTURED_OUTPUT_INSTRUCTIONS
        ),
        expected_output=(
            'JSON: {"agent_name": "Survivor Risk Estimation Specialist", '
            '"summary": "...", "confidence": 0.0-1.0, '
            '"recommendations": ["Survivor probability: <n>", '
            '"Estimated survivors: <n>", "Time-sensitivity: <level>", '
            '"Rescue window: <n> hours"]}'
        ),
        agent=agent,
        context=context or [],
    )


def medical_triage_task(agent: Any, incident: dict, context: list = None) -> Task:
    """
    Task 4 — Medical Triage Agent
    Receives: Task 3 survivor count and time-sensitivity rating.
    """
    return Task(
        description=(
            f"Using the survivor probability output from the previous agent, "
            f"perform medical triage assessment for:\n"
            f"  Incident type: {incident.get('type')}\n"
            f"  Location:      {incident.get('location')}\n"
            f"  Severity:      {incident.get('severity')}/5\n\n"
            f"Using the survivor count and time-sensitivity from the prior agent, determine:\n"
            f"  1. Medical priority level (critical/high/medium/low)\n"
            f"  2. Likely trauma types (blunt force, crush, burns, respiratory, drowning, etc.)\n"
            f"  3. Recommended medical resources to deploy\n"
            f"  4. Estimated critical vs. walking-wounded ratio\n"
            + _STRUCTURED_OUTPUT_INSTRUCTIONS
        ),
        expected_output=(
            'JSON: {"agent_name": "Medical Emergency Triage Coordinator", '
            '"summary": "...", "confidence": 0.0-1.0, '
            '"recommendations": ["Medical priority: <level>", '
            '"Trauma types: <list>", "Deploy: <resource list>", '
            '"Critical ratio: <n>%"]}'
        ),
        agent=agent,
        context=context or [],
    )


def prioritize_incident_task(agent: Any, incident: dict, context: list = None) -> Task:
    """
    Task 5 — Priority Agent
    Receives: Tasks 1-4 outputs for full situational awareness before ranking.
    """
    return Task(
        description=(
            f"Using all outputs from the disaster classification, incident understanding, "
            f"survivor probability, and medical triage agents, assign a priority level to:\n"
            f"  Type:     {incident.get('type')}\n"
            f"  Location: {incident.get('location')}\n"
            f"  Severity: {incident.get('severity')}/5\n\n"
            f"Consider the survivor count, medical urgency, affected population, "
            f"and infrastructure damage assessed by prior agents. Then assign:\n"
            f"  1. Priority rank (P1=highest to P5=lowest)\n"
            f"  2. Dispatch urgency (immediate/urgent/normal)\n"
            f"  3. Estimated response window in minutes\n"
            f"  4. Priority score (0.0 to 1.0)\n"
            + _STRUCTURED_OUTPUT_INSTRUCTIONS
        ),
        expected_output=(
            'JSON: {"agent_name": "Emergency Response Prioritization Officer", '
            '"summary": "...", "confidence": 0.0-1.0, '
            '"recommendations": ["Priority: P<n>", '
            '"Dispatch: <urgency>", "Response window: <n> minutes", '
            '"Priority score: <n>"]}'
        ),
        agent=agent,
        context=context or [],
    )


def allocate_resources_task(agent: Any, incident: dict, context: list = None) -> Task:
    """
    Task 6 — Resource Allocation Agent
    Receives: Task 4 (medical needs) and Task 5 (priority level).
    """
    return Task(
        description=(
            f"Using the medical triage requirements and priority level established "
            f"by the previous agents, determine the resource deployment plan for:\n"
            f"  Type:     {incident.get('type')}\n"
            f"  Location: {incident.get('location')}\n"
            f"  Severity: {incident.get('severity')}/5\n\n"
            f"Match resource types to the specific incident type and medical needs "
            f"identified by prior agents (e.g., water rescue for floods, "
            f"hazmat units for industrial, fire trucks for fires). Specify:\n"
            f"  1. Each resource type to dispatch\n"
            f"  2. Unit count per type\n"
            f"  3. Estimated ETA in minutes per type\n"
            + _STRUCTURED_OUTPUT_INSTRUCTIONS
        ),
        expected_output=(
            'JSON: {"agent_name": "Emergency Resource Coordinator", '
            '"summary": "...", "confidence": 0.0-1.0, '
            '"recommendations": ["Ambulances: <n> (ETA <t>min)", '
            '"Rescue teams: <n> (ETA <t>min)", '
            '"Helicopters: <n> (ETA <t>min)"]}'
        ),
        agent=agent,
        context=context or [],
    )


def coordinate_hospitals_task(agent: Any, incident: dict, context: list = None) -> Task:
    """
    Task 7 — Hospital Coordination Agent
    Receives: Task 3 (survivor count), Task 4 (trauma types), Task 5 (priority).
    """
    return Task(
        description=(
            f"Using the estimated survivor count and trauma types identified by "
            f"prior agents, identify and rank hospitals to receive casualties from:\n"
            f"  Location: {incident.get('location')}\n"
            f"  Type:     {incident.get('type')}\n"
            f"  Severity: {incident.get('severity')}\n\n"
            f"Use the trauma types and casualty count from prior agents to match "
            f"hospitals by specialization (trauma, burn, ICU). Provide:\n"
            f"  1. Primary hospital (closest with matching specialization)\n"
            f"  2. Secondary hospital (backup capacity)\n"
            f"  3. Patient routing count per hospital\n"
            f"  4. Estimated distance per hospital\n"
            + _STRUCTURED_OUTPUT_INSTRUCTIONS
        ),
        expected_output=(
            'JSON: {"agent_name": "Hospital Liaison and Bed Capacity Coordinator", '
            '"summary": "...", "confidence": 0.0-1.0, '
            '"recommendations": ["Primary: <hospital> (<n>km, <n> patients)", '
            '"Secondary: <hospital> (<n>km, <n> patients)"]}'
        ),
        agent=agent,
        context=context or [],
    )


def predict_risks_task(agent: Any, incident: dict, context: list = None) -> Task:
    """
    Task 8 — Risk Prediction Agent
    Receives: Task 1 (classification) and Task 2 (impact zone, infrastructure).
    """
    return Task(
        description=(
            f"Using the disaster classification and infrastructure assessment from "
            f"prior agents, assess secondary and evolving risks for:\n"
            f"  Type:     {incident.get('type')}\n"
            f"  Location: {incident.get('location')}\n"
            f"  Severity: {incident.get('severity')}/5\n\n"
            f"Using the impact zone and infrastructure damage identified by prior "
            f"agents, assess:\n"
            f"  1. Secondary risk type (aftershock / flood escalation / fire spread / hazmat)\n"
            f"  2. Risk evolution score (0.0–1.0)\n"
            f"  3. Risk time window (next 1h / 6h / 24h)\n"
            f"  4. Specific precautionary measures\n"
            + _STRUCTURED_OUTPUT_INSTRUCTIONS
        ),
        expected_output=(
            'JSON: {"agent_name": "Disaster Risk Forecasting Analyst", '
            '"summary": "...", "confidence": 0.0-1.0, '
            '"recommendations": ["Risk: <type> (score: <n>)", '
            '"Window: <timeframe>", "Precaution: <action>"]}'
        ),
        agent=agent,
        context=context or [],
    )


def draft_alerts_task(agent: Any, incident: dict, context: list = None) -> Task:
    """
    Task 9 — Communication Agent
    Receives: Task 5 (priority), Task 6 (resources), Task 7 (hospitals), Task 8 (risks).
    """
    return Task(
        description=(
            f"Using the priority level, dispatched resources, hospital routing, and "
            f"risk warnings established by all prior agents, draft three distinct "
            f"alert messages for the rescue operation at {incident.get('location')}:\n\n"
            f"  1. Field team SMS alert — brief, action-oriented, include priority "
            f"     and resource deployment from prior agent outputs\n"
            f"  2. Hospital preparation notice — include casualty count and trauma "
            f"     types from prior agents; trigger appropriate MCI protocol\n"
            f"  3. Public safety announcement — clear, calm, concise; incorporate "
            f"     risk warnings from the risk prediction agent\n\n"
            f"Each message must directly reference the outputs of prior agents "
            f"(do not invent new priorities, counts, or hospital names).\n"
            + _STRUCTURED_OUTPUT_INSTRUCTIONS
        ),
        expected_output=(
            'JSON: {"agent_name": "Emergency Communications Officer", '
            '"summary": "...", "confidence": 0.0-1.0, '
            '"recommendations": ["Field SMS: <text>", '
            '"Hospital notice: <text>", "Public alert: <text>"]}'
        ),
        agent=agent,
        context=context or [],
    )


def assemble_rescue_plan_task(agent: Any, incident: dict, context: list = None) -> Task:
    """
    Task 10 — Command Orchestrator Agent
    Receives: ALL 9 prior task outputs via context=[t1...t9].

    This agent MUST NOT regenerate data independently.
    Its sole job is to collect, validate, and assemble the final rescue plan
    from the outputs already produced by agents 1-9.
    """
    return Task(
        description=(
            f"You are the final command orchestrator. You have received the full "
            f"output from all 9 prior agents. Your job is NOT to reason independently "
            f"— it is to synthesize and assemble their outputs into a single, "
            f"structured rescue plan for:\n\n"
            f"  Incident: {incident.get('title')}\n"
            f"  Location: {incident.get('location')}\n"
            f"  Type:     {incident.get('type')}\n"
            f"  Severity: {incident.get('severity')}/5\n\n"
            f"Collect from prior agent outputs and assemble the following fields:\n"
            f"  - priority:              from Priority Agent (P1-P5)\n"
            f"  - severity:              {incident.get('severity')} (fixed from incident)\n"
            f"  - affected_area:         from Incident Understanding Agent\n"
            f"  - estimated_survivors:   from Survivor Probability Agent\n"
            f"  - survivor_probability:  from Survivor Probability Agent (0.0-1.0)\n"
            f"  - priority_score:        from Priority Agent (0.0-1.0)\n"
            f"  - confidence_score:      average confidence of all prior agents\n"
            f"  - medical_priority:      from Medical Triage Agent\n"
            f"  - dispatch_urgency:      from Priority Agent\n"
            f"  - recommended_hospital:  primary hospital from Hospital Coordination Agent\n"
            f"  - recommended_resources: list from Resource Allocation Agent\n"
            f"  - hospitals:             routing list from Hospital Coordination Agent\n"
            f"  - alert_actions:         three messages from Communication Agent\n"
            f"  - risk_warnings:         list from Risk Prediction Agent\n\n"
            f"Output a complete JSON rescue plan using ONLY data from prior agents.\n"
            f"Use the following exact JSON structure for the rescue plan:\n"
            f'{{"priority": "P1", "severity": {incident.get("severity")}, '
            f'"affected_area": "...", "estimated_survivors": 0, '
            f'"survivor_probability": 0.0, "priority_score": 0.0, '
            f'"confidence_score": 0.0, "medical_priority": "critical", '
            f'"dispatch_urgency": "immediate", "recommended_hospital": "...", '
            f'"recommended_resources": [{{"type": "ambulance", "count": 0, "eta_minutes": 0}}], '
            f'"hospitals": [{{"name": "...", "distance_km": 0.0, "available_beds": 0, "patient_routing": 0}}], '
            f'"alert_actions": {{"field_team": "...", "hospital": "...", "public": "..."}}, '
            f'"risk_warnings": ["..."]}}\n'
        ),
        expected_output=(
            "A complete, valid JSON rescue plan assembled from all prior agent outputs. "
            "No fields may be invented — all values must come from prior agents. "
            "The JSON must include: priority, severity, affected_area, estimated_survivors, "
            "survivor_probability, priority_score, confidence_score, medical_priority, "
            "dispatch_urgency, recommended_hospital, recommended_resources (list), "
            "hospitals (list), alert_actions (object with field_team/hospital/public), "
            "and risk_warnings (list)."
        ),
        agent=agent,
        context=context or [],
    )
