"""Agent 1: Disaster Intelligence Agent"""

from crewai import Agent
from typing import Optional, Any


def create_disaster_intelligence_agent(llm: Optional[Any] = None) -> Agent:
    return Agent(
        role="Disaster Intelligence Analyst",
        goal=(
            "Classify the incident type, assess initial severity on a 1-5 scale, "
            "and identify the geographic impact zone and threat category."
        ),
        backstory=(
            "A seasoned emergency analyst trained on thousands of disaster reports worldwide. "
            "You specialize in rapid situation classification and threat mapping, having worked "
            "with FEMA, NDMA, and international disaster response agencies."
        ),
        verbose=True,
        allow_delegation=False,
        llm=llm,
    )
