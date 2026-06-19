"""
RescueNet AI — Mock Database
In-memory data store for local development.
Replace with Supabase client or SQLAlchemy when connecting a real database.
"""

import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any


# ===========================
# Mock data stores (in-memory)
# ===========================

_incidents: Dict[str, Dict] = {}
_hospitals: Dict[str, Dict] = {}
_resources: Dict[str, Dict] = {}
_agent_decisions: List[Dict] = []
_rescue_requests: Dict[str, Dict] = {}

# Pre-populate with seed data on module load
def _seed():
    """Load demo data into in-memory stores."""
    from seed.seed_data import SEED_INCIDENTS, SEED_HOSPITALS, SEED_RESOURCES
    for item in SEED_INCIDENTS:
        _incidents[item["id"]] = item
    for item in SEED_HOSPITALS:
        _hospitals[item["id"]] = item
    for item in SEED_RESOURCES:
        _resources[item["id"]] = item

try:
    _seed()
except Exception:
    # Seed data not available; that's fine for unit tests
    pass


# ===========================
# Incident repository
# ===========================

def create_incident(data: Dict) -> Dict:
    incident_id = str(uuid.uuid4())
    record = {
        "id": incident_id,
        "status": "reported",
        "created_at": datetime.utcnow().isoformat() + "Z",
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
    return results[offset : offset + limit]


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
    decision["created_at"] = datetime.utcnow().isoformat() + "Z"
    _agent_decisions.append(decision)


def get_agent_decisions(incident_id: str) -> List[Dict]:
    return [d for d in _agent_decisions if d.get("incident_id") == incident_id]


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
        "dispatched_at": datetime.utcnow().isoformat() + "Z",
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    _rescue_requests[incident_id] = record
    return record


def get_rescue_request(incident_id: str) -> Optional[Dict]:
    return _rescue_requests.get(incident_id)
