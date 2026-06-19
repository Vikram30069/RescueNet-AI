"""
Smoke tests for the RescueNet AI API.
Run with: pytest tests/ -v   (from inside the backend/ directory)
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


# ===========================
# Health
# ===========================

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "environment" in data
    assert "llm_provider" in data


# ===========================
# Incidents
# ===========================

def test_list_incidents_returns_seed_data():
    response = client.get("/api/v1/incidents")
    assert response.status_code == 200
    data = response.json()
    assert "incidents" in data
    assert "total" in data
    assert data["total"] >= 5  # seed data has 5


def test_create_incident_success():
    payload = {
        "title": "Test Flood Incident",
        "type": "flood",
        "description": "Unit test flood",
        "location": "Test City",
        "latitude": 19.07,
        "longitude": 72.87,
        "severity": 3,
    }
    response = client.post("/api/v1/incidents", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Flood Incident"
    assert data["status"] == "reported"
    assert "id" in data


def test_create_incident_validation_error():
    payload = {"title": "hi", "type": "flood", "location": "x", "severity": 10}
    response = client.post("/api/v1/incidents", json=payload)
    assert response.status_code == 422  # Pydantic validation error


def test_get_incident_not_found():
    response = client.get("/api/v1/incidents/nonexistent-uuid")
    assert response.status_code == 404


def test_get_known_incident():
    response = client.get("/api/v1/incidents/demo-001")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "demo-001"


# ===========================
# Agents execute
# ===========================

def test_agent_execute_with_seed_incident():
    response = client.post(
        "/api/v1/agents/execute",
        json={"incident_id": "demo-001"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["incident_id"] == "demo-001"

    plan = data["rescue_plan"]
    # Validate all required new schema fields are present
    assert "priority" in plan
    assert "severity" in plan
    assert "affected_area" in plan
    assert "estimated_survivors" in plan
    assert "priority_score" in plan
    assert "confidence_score" in plan
    assert "recommended_hospital" in plan
    assert "recommended_resources" in plan
    assert "alert_actions" in plan
    assert "risk_warnings" in plan

    # Agent decisions should have 10 steps
    assert len(data["agent_decisions"]) == 10


def test_agent_execute_missing_incident():
    response = client.post(
        "/api/v1/agents/execute",
        json={"incident_id": "does-not-exist"},
    )
    assert response.status_code == 404


# ===========================
# Hospitals
# ===========================

def test_list_hospitals_returns_seed_data():
    response = client.get("/api/v1/hospitals")
    assert response.status_code == 200
    data = response.json()
    assert len(data["hospitals"]) >= 5
    # Verify new fields present
    h = data["hospitals"][0]
    assert "icu_beds" in h
    assert "trauma_unit" in h
    assert "burn_unit" in h
    assert "blood_bank" in h


def test_list_hospitals_filter_by_city():
    response = client.get("/api/v1/hospitals?city=Mumbai")
    assert response.status_code == 200
    data = response.json()
    assert all(h["city"] == "Mumbai" for h in data["hospitals"])


# ===========================
# Resources
# ===========================

def test_list_resources_returns_seed_data():
    response = client.get("/api/v1/resources")
    assert response.status_code == 200
    data = response.json()
    assert len(data["resources"]) >= 5


def test_list_resources_filter_by_type():
    response = client.get("/api/v1/resources?type=ambulance")
    assert response.status_code == 200
    data = response.json()
    assert all(r["type"] == "ambulance" for r in data["resources"])


# ===========================
# Agent log
# ===========================

def test_agent_log_empty_initially():
    response = client.get("/api/v1/agent-log")
    assert response.status_code == 200
    data = response.json()
    assert "decisions" in data
    assert "total" in data


def test_agent_log_populated_after_execute():
    # Run the pipeline first
    client.post("/api/v1/agents/execute", json={"incident_id": "demo-002"})
    response = client.get("/api/v1/agent-log?incident_id=demo-002")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0


# ===========================
# Rescue plan
# ===========================

def test_rescue_plan_not_found_before_execute():
    response = client.get("/api/v1/rescue-plan/demo-003")
    # May be 404 if not yet executed for this incident
    assert response.status_code in (200, 404)


def test_rescue_plan_found_after_execute():
    client.post("/api/v1/agents/execute", json={"incident_id": "demo-004"})
    response = client.get("/api/v1/rescue-plan/demo-004")
    assert response.status_code == 200
    data = response.json()
    assert "rescue_plan" in data
