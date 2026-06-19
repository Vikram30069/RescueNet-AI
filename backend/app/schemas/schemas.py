"""
RescueNet AI — Pydantic Schemas
Request and response models for all API endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime
from enum import Enum


# ===========================
# Enums
# ===========================

class IncidentType(str, Enum):
    flood = "flood"
    earthquake = "earthquake"
    fire = "fire"
    industrial = "industrial"
    landslide = "landslide"
    cyclone = "cyclone"
    other = "other"


class IncidentStatus(str, Enum):
    reported = "reported"
    active = "active"
    resolved = "resolved"
    closed = "closed"


class ResourceType(str, Enum):
    ambulance = "ambulance"
    helicopter = "helicopter"
    rescue_team = "rescue_team"
    fire_truck = "fire_truck"
    water_rescue = "water_rescue"
    medical_unit = "medical_unit"


class PriorityLevel(str, Enum):
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"
    P4 = "P4"
    P5 = "P5"


class MedicalPriority(str, Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


# ===========================
# Incident Schemas
# ===========================

class IncidentCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=200)
    type: IncidentType
    description: Optional[str] = None
    location: str = Field(..., min_length=2)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    severity: int = Field(..., ge=1, le=5)


class IncidentResponse(BaseModel):
    id: str
    title: str
    type: str
    description: Optional[str]
    location: str
    latitude: Optional[float]
    longitude: Optional[float]
    severity: int
    status: str
    created_at: str


class IncidentListResponse(BaseModel):
    incidents: List[IncidentResponse]
    total: int
    limit: int
    offset: int


# ===========================
# Hospital Schemas
# ===========================

class HospitalResponse(BaseModel):
    id: str
    name: str
    address: Optional[str]
    city: str
    latitude: Optional[float]
    longitude: Optional[float]
    total_beds: int
    available_beds: int
    icu_beds: int
    specializations: List[str]
    contact_phone: Optional[str]
    is_active: bool


class HospitalListResponse(BaseModel):
    hospitals: List[HospitalResponse]


# ===========================
# Resource Schemas
# ===========================

class ResourceResponse(BaseModel):
    id: str
    name: str
    type: str
    quantity: int
    available: int
    status: str
    location: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]


class ResourceListResponse(BaseModel):
    resources: List[ResourceResponse]


# ===========================
# Agent / Rescue Plan Schemas
# ===========================

class AgentExecuteRequest(BaseModel):
    incident_id: str


class ResourceDispatch(BaseModel):
    type: str
    count: int
    eta_minutes: int


class HospitalRouting(BaseModel):
    name: str
    distance_km: float
    available_beds: int
    patient_routing: int  # number of patients to send here


class AlertMessages(BaseModel):
    field_team: str
    hospital: str
    public: str


class RescuePlan(BaseModel):
    priority: str
    survivor_estimate: int
    survivor_probability: float
    medical_priority: str
    dispatch_urgency: str
    resources: List[ResourceDispatch]
    hospitals: List[HospitalRouting]
    risk_warnings: List[str]
    alert_messages: AlertMessages


class AgentDecisionSummary(BaseModel):
    agent: str
    output: str


class AgentExecuteResponse(BaseModel):
    incident_id: str
    status: str
    rescue_plan: RescuePlan
    agent_decisions: List[AgentDecisionSummary]


# ===========================
# Health
# ===========================

class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str
