# RescueNet AI — API Specification

**Base URL**: `http://localhost:8000`  
**API Prefix**: `/api/v1`  
**Interactive Docs**: `http://localhost:8000/docs`

---

## Health

### GET `/health`
Returns server status.

**Response 200**
```json
{
  "status": "ok",
  "version": "0.1.0",
  "environment": "development"
}
```

---

## Incidents

### POST `/api/v1/incidents`
Submit a new incident report.

**Request Body**
```json
{
  "title": "Major Flooding in South Mumbai",
  "type": "flood",
  "description": "Severe flooding after 3-day monsoon. Residential areas submerged.",
  "location": "South Mumbai, Maharashtra",
  "latitude": 18.9220,
  "longitude": 72.8347,
  "severity": 4
}
```

**Response 201**
```json
{
  "id": "uuid",
  "title": "Major Flooding in South Mumbai",
  "type": "flood",
  "status": "reported",
  "severity": 4,
  "created_at": "2024-01-15T08:30:00Z"
}
```

---

### GET `/api/v1/incidents`
List all incidents with optional filters.

**Query Parameters**
| Param | Type | Description |
|---|---|---|
| `status` | string | Filter by status: `reported`, `active`, `resolved` |
| `type` | string | Filter by type: `flood`, `earthquake`, `fire`, etc. |
| `limit` | int | Max results (default: 20) |
| `offset` | int | Pagination offset (default: 0) |

**Response 200**
```json
{
  "incidents": [...],
  "total": 15,
  "limit": 20,
  "offset": 0
}
```

---

### GET `/api/v1/incidents/{incident_id}`
Get a specific incident by ID.

**Response 200** — same as single incident object above.

---

## Agents

### POST `/api/v1/agents/execute`
Trigger the full CrewAI agent pipeline for an incident.

**Request Body**
```json
{
  "incident_id": "uuid"
}
```

**Response 200**
```json
{
  "incident_id": "uuid",
  "status": "completed",
  "rescue_plan": {
    "priority": "P1",
    "survivor_estimate": 250,
    "survivor_probability": 0.82,
    "medical_priority": "critical",
    "dispatch_urgency": "immediate",
    "resources": [
      { "type": "ambulance", "count": 8, "eta_minutes": 12 },
      { "type": "helicopter", "count": 2, "eta_minutes": 20 },
      { "type": "rescue_team", "count": 4, "eta_minutes": 15 }
    ],
    "hospitals": [
      {
        "name": "KEM Hospital",
        "distance_km": 3.2,
        "available_beds": 45,
        "patient_routing": 80
      }
    ],
    "risk_warnings": ["Secondary flooding risk in next 6 hours"],
    "alert_messages": {
      "field_team": "PRIORITY 1: Deploy all units to South Mumbai flood zone immediately.",
      "hospital": "Prepare for 80 incoming trauma casualties from South Mumbai.",
      "public": "Emergency alert: Avoid South Mumbai area. Rescue operations underway."
    }
  },
  "agent_decisions": [
    {
      "agent": "disaster_intelligence",
      "output": "Classified as FLOOD severity 4, impact radius 5km"
    }
  ]
}
```

---

### GET `/api/v1/agents/decisions/{incident_id}`
Get all recorded agent decisions for an incident.

**Response 200**
```json
{
  "incident_id": "uuid",
  "decisions": [
    {
      "id": "uuid",
      "agent_name": "disaster_intelligence",
      "task_name": "classify_incident",
      "output_data": { ... },
      "duration_ms": 1200,
      "status": "mock",
      "created_at": "..."
    }
  ]
}
```

---

## Hospitals

### GET `/api/v1/hospitals`
List hospitals, optionally filtered by city or availability.

**Query Parameters**
| Param | Type | Description |
|---|---|---|
| `city` | string | Filter by city name |
| `min_beds` | int | Minimum available beds |
| `specialization` | string | e.g., `trauma`, `burns` |

**Response 200**
```json
{
  "hospitals": [
    {
      "id": "uuid",
      "name": "KEM Hospital",
      "city": "Mumbai",
      "available_beds": 45,
      "icu_beds": 12,
      "specializations": ["trauma", "burns"],
      "latitude": 18.9987,
      "longitude": 72.8397
    }
  ]
}
```

---

### GET `/api/v1/hospitals/{hospital_id}`
Get details for a specific hospital.

---

## Resources

### GET `/api/v1/resources`
List all emergency resources.

**Query Parameters**
| Param | Type | Description |
|---|---|---|
| `type` | string | `ambulance`, `helicopter`, `rescue_team`, etc. |
| `status` | string | `available`, `deployed`, `maintenance` |

**Response 200**
```json
{
  "resources": [
    {
      "id": "uuid",
      "name": "Ambulance Unit 7",
      "type": "ambulance",
      "available": 3,
      "quantity": 5,
      "status": "available",
      "location": "Central Fire Station, Mumbai"
    }
  ]
}
```

---

## Rescue Plans

### GET `/api/v1/rescue-plan/{incident_id}`
Get the generated rescue plan for an incident.

**Response 200** — Same structure as the `rescue_plan` field in the agents execute response.

---

## Error Responses

All errors follow a consistent format:

```json
{
  "detail": "Incident not found",
  "status_code": 404
}
```

| Code | Meaning |
|---|---|
| 400 | Bad request / validation error |
| 404 | Resource not found |
| 422 | Pydantic validation error |
| 500 | Internal server error |
