# RescueNet AI — Project Overview

## Problem Statement

When disasters strike — floods, earthquakes, fires, industrial accidents — emergency responders face an overwhelming information problem. Rescue teams lack:
- Real-time situational awareness
- Automated survivor risk scoring
- Optimal hospital and resource matching
- Coordination tools that work under pressure

Lives are lost not because help isn't available, but because help doesn't reach the right people fast enough.

---

## What RescueNet AI Does

RescueNet AI is a **multi-agent AI system** that orchestrates disaster response from the moment an incident is reported to the moment a rescue plan is dispatched.

```
Incident Reported
       ↓
  10 AI Agents Collaborate
       ↓
  Survivor Risk Scores Generated
       ↓
  Hospitals & Resources Matched
       ↓
  Rescue Plan Dispatched
       ↓
  Alerts Sent (SMS / Call / Dashboard)
```

---

## Core Features

| Feature | Description |
|---|---|
| **Incident Intake** | Submit incidents via API or dashboard form |
| **AI Triage** | 10 specialized CrewAI agents analyze and score incidents |
| **Survivor Probability** | Risk scoring based on location, type, magnitude |
| **Hospital Matching** | Nearest available hospitals with bed capacity |
| **Resource Allocation** | Ambulances, helicopters, rescue teams dispatched |
| **Rescue Plan Output** | Structured JSON plan ready for field teams |
| **Alert System** | SMS/calls via Twilio/Connect (mock in MVP) |
| **Audit Trail** | All agent decisions logged for review |
| **Map View** | Incident pins and hospital/resource overlays |

---

## MVP Scope (Hackathon)

### ✅ In Scope
- Incident submission and storage
- 10 CrewAI agents with mock LLM execution
- Provider-agnostic LLM config (OpenAI / Gemini / Ollama / mock)
- Hospital and resource lookup
- Rescue plan generation
- Seed data for demo
- Minimal dashboard frontend

### ❌ Out of Scope for MVP
- Real-time satellite data ingestion
- Live Twilio SMS/calls (configured but not wired)
- Production authentication (OAuth / SSO)
- Full map integration (placeholder component only)
- Historical ML training pipeline

---

## User Personas

| Persona | Role |
|---|---|
| **Emergency Commander** | Reviews AI rescue plan and approves dispatch |
| **Field Coordinator** | Receives plan, coordinates on-ground teams |
| **Hospital Administrator** | Updates bed capacity and receives incoming patient alerts |
| **System Operator** | Manages the RescueNet platform and audit logs |

---

## Data Flow Summary

1. Incident submitted via POST `/api/v1/incidents`
2. API triggers `agents/orchestrator.py` with incident payload
3. 10 agents analyze in sequence (CrewAI crew)
4. Structured rescue plan returned and stored
5. Alert logs written to DB
6. Dashboard displays plan and incident map

---

## Future Roadmap

| Phase | Feature |
|---|---|
| v0.2 | Live Twilio SMS + Amazon Connect voice calls |
| v0.3 | AWS Bedrock model integration |
| v0.4 | Real-time incident stream (IoT / sensor feeds) |
| v0.5 | ML-based disaster risk forecasting |
| v1.0 | Full production deployment on AWS ECS + RDS |
