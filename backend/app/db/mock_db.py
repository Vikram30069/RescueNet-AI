"""
RescueNet AI — Mock Database
In-memory data store for local development.
All seed data is inlined here so the module has zero external dependencies.
Replace with Supabase client or SQLAlchemy when connecting a real database.
"""

import uuid
from datetime import datetime, timezone

def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
from typing import List, Optional, Dict, Any


# ===========================
# Inline seed data
# ===========================

_SEED_INCIDENTS = [
    {
        "id": "demo-001",
        "title": "Major Flooding in South Mumbai",
        "type": "flood",
        "description": "Severe flooding after 3-day monsoon. Multiple residential areas submerged. Roads blocked. Reports of people stranded on rooftops.",
        "location": "South Mumbai, Maharashtra, India",
        "latitude": 18.9220,
        "longitude": 72.8347,
        "severity": 4,
        "status": "active",
        "created_at": "2024-06-15T06:00:00Z",
    },
    {
        "id": "demo-002",
        "title": "Earthquake — Jaipur Industrial Zone",
        "type": "earthquake",
        "description": "Magnitude 6.2 earthquake. Industrial buildings collapsed. Multiple workers trapped under rubble.",
        "location": "Jaipur, Rajasthan, India",
        "latitude": 26.9124,
        "longitude": 75.7873,
        "severity": 5,
        "status": "active",
        "created_at": "2024-06-15T07:30:00Z",
    },
    {
        "id": "demo-003",
        "title": "Chemical Plant Fire — Pune",
        "type": "fire",
        "description": "Fire at chemical storage facility. Hazardous gas leak reported. 500m evacuation radius enforced.",
        "location": "Pune, Maharashtra, India",
        "latitude": 18.5204,
        "longitude": 73.8567,
        "severity": 3,
        "status": "reported",
        "created_at": "2024-06-15T09:00:00Z",
    },
    {
        "id": "demo-004",
        "title": "Cyclone Landfall — Odisha Coast",
        "type": "cyclone",
        "description": "Category 3 cyclone making landfall. Coastal villages at extreme risk. Mass evacuation orders issued.",
        "location": "Puri, Odisha, India",
        "latitude": 19.8135,
        "longitude": 85.8312,
        "severity": 5,
        "status": "active",
        "created_at": "2024-06-15T10:15:00Z",
    },
    {
        "id": "demo-005",
        "title": "Landslide — Himachal Highway",
        "type": "landslide",
        "description": "Major landslide blocking National Highway 5. Multiple vehicles buried. 12 confirmed trapped.",
        "location": "Shimla, Himachal Pradesh, India",
        "latitude": 31.1048,
        "longitude": 77.1734,
        "severity": 3,
        "status": "reported",
        "created_at": "2024-06-15T11:00:00Z",
    },
]

_SEED_HOSPITALS = [
    {
        "id": "hosp-001",
        "name": "KEM Hospital",
        "address": "Acharya Donde Marg, Parel",
        "city": "Mumbai",
        "latitude": 19.0027,
        "longitude": 72.8397,
        "total_beds": 800,
        "available_beds": 120,
        "icu_beds": 30,
        "trauma_unit": True,
        "burn_unit": True,
        "blood_bank": True,
        "specializations": ["trauma", "burns", "pediatric", "neurology"],
        "contact_phone": "+91-22-24107000",
        "is_active": True,
    },
    {
        "id": "hosp-002",
        "name": "Nair Hospital",
        "address": "Dr. A. L. Nair Road, Mumbai Central",
        "city": "Mumbai",
        "latitude": 18.9697,
        "longitude": 72.8196,
        "total_beds": 650,
        "available_beds": 85,
        "icu_beds": 20,
        "trauma_unit": True,
        "burn_unit": False,
        "blood_bank": True,
        "specializations": ["trauma", "orthopedic", "cardiology"],
        "contact_phone": "+91-22-23027600",
        "is_active": True,
    },
    {
        "id": "hosp-003",
        "name": "Sawai Man Singh Hospital",
        "address": "Jawaharlal Nehru Marg",
        "city": "Jaipur",
        "latitude": 26.9036,
        "longitude": 75.7999,
        "total_beds": 1000,
        "available_beds": 200,
        "icu_beds": 45,
        "trauma_unit": True,
        "burn_unit": True,
        "blood_bank": True,
        "specializations": ["trauma", "burns", "orthopedic", "neurosurgery"],
        "contact_phone": "+91-141-2518888",
        "is_active": True,
    },
    {
        "id": "hosp-004",
        "name": "Sassoon General Hospital",
        "address": "Near Pune Railway Station",
        "city": "Pune",
        "latitude": 18.5277,
        "longitude": 73.8730,
        "total_beds": 700,
        "available_beds": 95,
        "icu_beds": 25,
        "trauma_unit": True,
        "burn_unit": False,
        "blood_bank": True,
        "specializations": ["trauma", "burns", "toxicology"],
        "contact_phone": "+91-20-26128000",
        "is_active": True,
    },
    {
        "id": "hosp-005",
        "name": "SCB Medical College Hospital",
        "address": "Mangalabag",
        "city": "Cuttack",
        "latitude": 20.4625,
        "longitude": 85.8828,
        "total_beds": 1200,
        "available_beds": 180,
        "icu_beds": 50,
        "trauma_unit": True,
        "burn_unit": True,
        "blood_bank": True,
        "specializations": ["trauma", "orthopedic", "cardiology", "disaster_response"],
        "contact_phone": "+91-671-2414388",
        "is_active": True,
    },
]

_SEED_RESOURCES = [
    {
        "id": "reso-001",
        "name": "Mumbai Ambulance Fleet A",
        "type": "ambulance",
        "quantity": 12,
        "available": 8,
        "location": "Central Dispatch, Mumbai",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "status": "available",
    },
    {
        "id": "reso-002",
        "name": "Air Rescue Helicopter 1",
        "type": "helicopter",
        "quantity": 2,
        "available": 1,
        "location": "Juhu Airport, Mumbai",
        "latitude": 19.0990,
        "longitude": 72.8490,
        "status": "available",
    },
    {
        "id": "reso-003",
        "name": "NDRF Rescue Team Alpha",
        "type": "rescue_team",
        "quantity": 30,
        "available": 30,
        "location": "NDRF Base, Mumbai",
        "latitude": 19.0600,
        "longitude": 72.8350,
        "status": "available",
    },
    {
        "id": "reso-004",
        "name": "Fire Brigade Unit 7",
        "type": "fire_truck",
        "quantity": 6,
        "available": 4,
        "location": "Dadar Fire Station, Mumbai",
        "latitude": 19.0178,
        "longitude": 72.8478,
        "status": "available",
    },
    {
        "id": "reso-005",
        "name": "Odisha Coast Guard Boats",
        "type": "water_rescue",
        "quantity": 10,
        "available": 7,
        "location": "Puri Coast Guard Station, Odisha",
        "latitude": 19.8000,
        "longitude": 85.8200,
        "status": "available",
    },
]


# ===========================
# In-memory stores
# ===========================

_incidents: Dict[str, Dict] = {}
_hospitals: Dict[str, Dict] = {}
_resources: Dict[str, Dict] = {}
_agent_decisions: List[Dict] = []
_rescue_requests: Dict[str, Dict] = {}


def _seed() -> None:
    """Load inline seed data into in-memory stores on module load."""
    for item in _SEED_INCIDENTS:
        _incidents[item["id"]] = item
    for item in _SEED_HOSPITALS:
        _hospitals[item["id"]] = item
    for item in _SEED_RESOURCES:
        _resources[item["id"]] = item


# Auto-seed on import
_seed()


# ===========================
# Incident repository
# ===========================

def create_incident(data: Dict) -> Dict:
    incident_id = str(uuid.uuid4())
    record = {
        "id": incident_id,
        "status": "reported",
        "created_at": _now(),
        **data,
    }
    _incidents[incident_id] = record
    return record


def get_incident(incident_id: str) -> Optional[Dict]:
    return _incidents.get(incident_id)


def list_incidents(
    status: Optional[str] = None,
    type: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
) -> List[Dict]:
    results = list(_incidents.values())
    if status:
        results = [i for i in results if i.get("status") == status]
    if type:
        results = [i for i in results if i.get("type") == type]
    # Sort newest first
    results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return results[offset: offset + limit]


def count_incidents() -> int:
    return len(_incidents)


# ===========================
# Hospital repository
# ===========================

def list_hospitals(
    city: Optional[str] = None,
    min_beds: Optional[int] = None,
    specialization: Optional[str] = None,
) -> List[Dict]:
    results = list(_hospitals.values())
    if city:
        results = [h for h in results if h.get("city", "").lower() == city.lower()]
    if min_beds is not None:
        results = [h for h in results if h.get("available_beds", 0) >= min_beds]
    if specialization:
        results = [
            h for h in results
            if specialization in h.get("specializations", [])
        ]
    return results


def get_hospital(hospital_id: str) -> Optional[Dict]:
    return _hospitals.get(hospital_id)


# ===========================
# Resource repository
# ===========================

def list_resources(
    type: Optional[str] = None,
    status: Optional[str] = None,
) -> List[Dict]:
    results = list(_resources.values())
    if type:
        results = [r for r in results if r.get("type") == type]
    if status:
        results = [r for r in results if r.get("status") == status]
    return results


# ===========================
# Agent decisions
# ===========================

def save_agent_decision(decision: Dict) -> None:
    decision["id"] = str(uuid.uuid4())
    decision["created_at"] = _now()
    _agent_decisions.append(decision)


def get_agent_decisions(incident_id: str) -> List[Dict]:
    return [d for d in _agent_decisions if d.get("incident_id") == incident_id]


def get_all_agent_decisions(limit: int = 50) -> List[Dict]:
    """Return most recent agent decisions across all incidents."""
    sorted_decisions = sorted(
        _agent_decisions,
        key=lambda x: x.get("created_at", ""),
        reverse=True,
    )
    return sorted_decisions[:limit]


# ===========================
# Rescue requests
# ===========================

def save_rescue_request(incident_id: str, plan: Dict) -> Dict:
    request_id = str(uuid.uuid4())
    record = {
        "id": request_id,
        "incident_id": incident_id,
        "rescue_plan": plan,
        "status": "dispatched",
        "dispatched_at": _now(),
        "created_at": _now(),
    }
    _rescue_requests[incident_id] = record
    return record


def get_rescue_request(incident_id: str) -> Optional[Dict]:
    return _rescue_requests.get(incident_id)
