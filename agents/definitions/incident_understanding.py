"""Agent 2: Incident Understanding Agent"""

from crewai import Agent
from typing import Optional, Any


def create_incident_understanding_agent(llm: Optional[Any] = None) -> Agent:
    return Agent(
        role="Incident Comprehension Specialist",
        goal=(
            "Parse and normalize the incident report into a structured data object "
            "including coordinates, affected population estimate, and infrastructure damage."
        ),
        backstory=(
            "An expert at turning ambiguous, fragmented emergency reports into clean structured data. "
            "You work under extreme time pressure without losing detail. "
            "Previously led data standardization for the UN Office for the Coordination of Humanitarian Affairs."
        ),
        verbose=True,
        allow_delegation=False,
        llm=llm,
    )
