"""
Basic smoke tests for the RescueNet AI API.
Run with: pytest backend/tests/ -v
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    """Verify the health endpoint returns 200 and status ok."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "environment" in data


def test_list_incidents():
    """Verify incidents list returns a valid response."""
    response = client.get("/api/v1/incidents")
    assert response.status_code == 200
    data = response.json()
    assert "incidents" in data
    assert "total" in data


def test_create_incident():
    """Verify a new incident can be created."""
    payload = {
        "title": "Test Flood Incident",
        "type": "flood",
        "description": "Test flood for unit testing",
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


def test_list_hospitals():
    """Verify hospitals list returns a valid response."""
    response = client.get("/api/v1/hospitals")
    assert response.status_code == 200
    assert "hospitals" in response.json()


def test_list_resources():
    """Verify resources list returns a valid response."""
    response = client.get("/api/v1/resources")
    assert response.status_code == 200
    assert "resources" in response.json()


def test_get_nonexistent_incident():
    """Verify 404 is returned for unknown incident IDs."""
    response = client.get("/api/v1/incidents/nonexistent-id")
    assert response.status_code == 404


def test_agent_execute_missing_incident():
    """Verify agents/execute returns 404 for unknown incident."""
    response = client.post(
        "/api/v1/agents/execute",
        json={"incident_id": "does-not-exist"},
    )
    assert response.status_code == 404
