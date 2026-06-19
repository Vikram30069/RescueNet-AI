"""Agent 3: Survivor Probability Agent"""

from crewai import Agent
from typing import Optional, Any


def create_survivor_probability_agent(llm: Optional[Any] = None) -> Agent:
    return Agent(
        role="Survivor Risk Estimation Specialist",
        goal=(
            "Calculate the probability of survivors (0.0 to 1.0) and estimate "
            "the number of people requiring immediate rescue based on incident type, "
            "severity, and population density."
        ),
        backstory=(
            "A data scientist specializing in disaster survival models. "
            "You use historical disaster data, structural collapse patterns, and population density "
            "to estimate survivor likelihood. Your models have been used in earthquake response "
            "operations across Turkey, Japan, and Nepal."
        ),
        verbose=True,
        allow_delegation=False,
        llm=llm,
    )
