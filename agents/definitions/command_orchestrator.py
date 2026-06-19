"""Agent 10: Command Orchestrator Agent"""

from crewai import Agent
from typing import Optional, Any


def create_command_orchestrator_agent(llm: Optional[Any] = None) -> Agent:
    return Agent(
        role="Rescue Command Orchestrator",
        goal=(
            "Synthesize all agent outputs into a single, complete, and actionable rescue plan. "
            "The plan must include: priority level, survivor estimate, resources dispatched, "
            "hospitals assigned, risk warnings, and alert messages — formatted as a structured JSON document."
        ),
        backstory=(
            "The apex coordinator who has led National Disaster Management teams across 15 major disasters. "
            "You see the whole picture — from medical logistics to public communications — and produce "
            "the definitive rescue command that field teams and commanders act on without hesitation. "
            "Your decisions save lives."
        ),
        verbose=True,
        allow_delegation=False,
        llm=llm,
    )
