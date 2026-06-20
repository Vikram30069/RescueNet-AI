"""
RescueNet AI — Pydantic Schemas
Request and response models for all API endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
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
    description: Optional[str] = None
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
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
    address: Optional[str] = None
    city: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    total_beds: int
    available_beds: int
    icu_beds: int
    trauma_unit: bool = False
    burn_unit: bool = False
    blood_bank: bool = False
    specializations: List[str] = []
    contact_phone: Optional[str] = None
    is_active: bool


class HospitalListResponse(BaseModel):
    hospitals: List[HospitalResponse]
    total: int


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
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class ResourceListResponse(BaseModel):
    resources: List[ResourceResponse]
    total: int


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
    patient_routing: int


class AlertMessages(BaseModel):
    field_team: str
    hospital: str
    public: str


class RescuePlan(BaseModel):
    # Core fields
    priority: str                       # P1-P5
    severity: int                       # 1-5 (mirrors incident)
    affected_area: str                  # location string
    estimated_survivors: int
    survivor_probability: float
    priority_score: float               # 0.0 – 1.0
    confidence_score: float             # 0.0 – 1.0

    # Medical
    medical_priority: str               # critical / high / medium / low
    dispatch_urgency: str               # immediate / urgent / normal

    # Recommendations
    recommended_hospital: str           # primary hospital name
    recommended_resources: List[ResourceDispatch]

    # Full routing detail (optional extras)
    hospitals: List[HospitalRouting] = []

    # Alerts and warnings
    alert_actions: AlertMessages
    risk_warnings: List[str] = []


class AgentDecisionSummary(BaseModel):
    agent: str
    output: str
    step: int = 0


class AgentExecuteResponse(BaseModel):
    incident_id: str
    status: str
    rescue_plan: RescuePlan
    agent_decisions: List[AgentDecisionSummary]
    notifications_sent: List[Dict[str, Any]] = []


# ===========================
# Agent log
# ===========================

class AgentLogEntry(BaseModel):
    id: str
    incident_id: Optional[str] = None
    agent_name: str
    output_data: Dict[str, Any] = {}
    status: str
    created_at: str


class AgentLogResponse(BaseModel):
    decisions: List[AgentLogEntry]
    total: int


# ===========================
# Health
# ===========================

class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str
    llm_provider: str
