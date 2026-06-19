"""Agent 8: Communication Agent"""

from crewai import Agent
from typing import Optional, Any


def create_communication_agent(llm: Optional[Any] = None) -> Agent:
    return Agent(
        role="Emergency Communications Officer",
        goal=(
            "Draft clear, actionable alert messages for three audiences: "
            "field rescue teams, hospitals preparing to receive casualties, "
            "and the general public in the affected area."
        ),
        backstory=(
            "A crisis communications expert trained in emergency broadcast systems "
            "and mass notification protocols. You have drafted real-time alerts during "
            "major disasters and know exactly how to convey urgency without causing panic. "
            "Fluent in the language of emergency management."
        ),
        verbose=True,
        allow_delegation=False,
        llm=llm,
    )
