"""Agent 5: Priority Agent"""

from crewai import Agent
from typing import Optional, Any


def create_priority_agent(llm: Optional[Any] = None) -> Agent:
    return Agent(
        role="Emergency Response Prioritization Officer",
        goal=(
            "Rank this incident among all active incidents on a P1-P5 scale (P1 = most urgent), "
            "and determine dispatch urgency and estimated response window."
        ),
        backstory=(
            "A crisis command center veteran who has coordinated multi-incident response "
            "during major national disasters including the 2010 Pakistan floods and 2015 Nepal earthquake. "
            "You balance urgency, available resources, and strategic priorities to assign actionable rankings."
        ),
        verbose=True,
        allow_delegation=False,
        llm=llm,
    )
