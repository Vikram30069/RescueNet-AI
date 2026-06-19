"""
RescueNet AI — Task Definitions
One Task per agent in the CrewAI pipeline.
"""

from crewai import Task
from typing import Any


def classify_incident_task(agent: Any, incident: dict) -> Task:
    return Task(
        description=(
            f"Analyze this incident report and classify it:\n"
            f"Title: {incident.get('title')}\n"
            f"Type: {incident.get('type')}\n"
            f"Location: {incident.get('location')}\n"
            f"Description: {incident.get('description', 'N/A')}\n"
            f"Reported Severity: {incident.get('severity')}/5\n\n"
            f"Return: classified disaster type, severity band (1-5), estimated impact radius in km."
        ),
        expected_output="Disaster classification with type, severity, and impact radius.",
        agent=agent,
    )


def understand_incident_task(agent: Any, incident: dict) -> Task:
    return Task(
        description=(
            f"Parse the incident data and produce a normalized structured summary:\n"
            f"Location: {incident.get('location')}\n"
            f"Coordinates: lat={incident.get('latitude')}, lon={incident.get('longitude')}\n"
            f"Type: {incident.get('type')}\n"
            f"Severity: {incident.get('severity')}\n\n"
            f"Return: structured object with coordinates, estimated affected population, and infrastructure damage assessment."
        ),
        expected_output="Structured incident data with affected population estimate and damage assessment.",
        agent=agent,
    )


def estimate_survivors_task(agent: Any, incident: dict) -> Task:
    return Task(
        description=(
            f"Estimate survivor probability for this incident:\n"
            f"Type: {incident.get('type')}\n"
            f"Location: {incident.get('location')}\n"
            f"Severity: {incident.get('severity')}/5\n\n"
            f"Return: survivor probability (0.0-1.0), estimated survivor count, and time-sensitivity rating."
        ),
        expected_output="Survivor probability score, estimated survivor count, and urgency level.",
        agent=agent,
    )


def medical_triage_task(agent: Any, incident: dict) -> Task:
    return Task(
        description=(
            f"Assess medical needs for a {incident.get('type')} incident with severity {incident.get('severity')}.\n"
            f"Location: {incident.get('location')}\n\n"
            f"Return: medical priority level (critical/high/medium/low), likely trauma types, and recommended medical resources."
        ),
        expected_output="Medical priority level, trauma categories, and recommended medical resource list.",
        agent=agent,
    )


def prioritize_incident_task(agent: Any, incident: dict) -> Task:
    return Task(
        description=(
            f"Assign a priority level to this incident (P1=highest, P5=lowest):\n"
            f"Type: {incident.get('type')}, Severity: {incident.get('severity')}/5\n"
            f"Location: {incident.get('location')}\n\n"
            f"Return: priority rank (P1-P5), dispatch urgency, and estimated response window in minutes."
        ),
        expected_output="Priority rank P1-P5, urgency label, and response window.",
        agent=agent,
    )


def allocate_resources_task(agent: Any, incident: dict) -> Task:
    return Task(
        description=(
            f"Determine the resource deployment plan for this incident:\n"
            f"Type: {incident.get('type')}, Severity: {incident.get('severity')}/5\n"
            f"Location: {incident.get('location')}\n\n"
            f"Return: list of resources to dispatch (type, count, ETA in minutes)."
        ),
        expected_output="Resource dispatch list with types, counts, and ETAs.",
        agent=agent,
    )


def coordinate_hospitals_task(agent: Any, incident: dict) -> Task:
    return Task(
        description=(
            f"Identify the best hospitals to receive casualties from:\n"
            f"Location: {incident.get('location')}\n"
            f"Type: {incident.get('type')}, Severity: {incident.get('severity')}\n\n"
            f"Return: ranked list of hospitals with name, distance, available beds, and patient routing count."
        ),
        expected_output="Ranked hospital list with routing plan.",
        agent=agent,
    )


def predict_risks_task(agent: Any, incident: dict) -> Task:
    return Task(
        description=(
            f"Assess secondary risks for a {incident.get('type')} at {incident.get('location')}.\n"
            f"Severity: {incident.get('severity')}/5\n\n"
            f"Return: list of secondary risk warnings with risk scores and recommended precautions."
        ),
        expected_output="Secondary risk warnings and recommended precautionary measures.",
        agent=agent,
    )


def draft_alerts_task(agent: Any, incident: dict) -> Task:
    return Task(
        description=(
            f"Draft alert messages for the rescue operation at {incident.get('location')}.\n"
            f"Incident type: {incident.get('type')}, Severity: {incident.get('severity')}/5\n\n"
            f"Write three messages:\n"
            f"1. Field team SMS alert\n"
            f"2. Hospital preparation notice\n"
            f"3. Public safety announcement"
        ),
        expected_output="Three formatted alert messages: field team, hospital, and public.",
        agent=agent,
    )


def assemble_rescue_plan_task(agent: Any, incident: dict) -> Task:
    return Task(
        description=(
            f"Using all analysis from the previous agents, assemble a final rescue plan for:\n"
            f"Incident: {incident.get('title')}\n"
            f"Location: {incident.get('location')}\n"
            f"Type: {incident.get('type')}, Severity: {incident.get('severity')}/5\n\n"
            f"Return a complete rescue plan with:\n"
            f"- Priority level\n"
            f"- Survivor estimate\n"
            f"- Resources dispatched\n"
            f"- Hospitals assigned\n"
            f"- Risk warnings\n"
            f"- Alert messages for field, hospital, and public"
        ),
        expected_output="Complete structured rescue plan ready for dispatch.",
        agent=agent,
    )
