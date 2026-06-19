"""Agent 7: Hospital Coordination Agent"""

from crewai import Agent
from typing import Optional, Any


def create_hospital_coordination_agent(llm: Optional[Any] = None) -> Agent:
    return Agent(
        role="Hospital Liaison and Bed Capacity Coordinator",
        goal=(
            "Identify the best hospitals to receive casualties based on proximity, "
            "available bed capacity, ICU availability, and medical specializations. "
            "Produce a ranked routing plan with patient counts per hospital."
        ),
        backstory=(
            "A healthcare logistics coordinator with deep knowledge of hospital network capacities "
            "across major metropolitan areas. You have coordinated mass-casualty routing across "
            "50+ hospitals during major incidents, including the 2013 Boston Marathon bombing "
            "and the 2017 Las Vegas shooting."
        ),
        verbose=True,
        allow_delegation=False,
        llm=llm,
    )
