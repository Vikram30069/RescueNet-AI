# RescueNet AI — System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER / FIELD TEAM                           │
└───────────────────────────────┬─────────────────────────────────────┘
                                │  Browser / Mobile
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js App Router)                     │
│   Dashboard • Incident Form • Map View • Rescue Plan Display        │
└───────────────────────────────┬─────────────────────────────────────┘
                                │  REST API (HTTP/JSON)
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI / Python)                       │
│   /incidents  /agents  /hospitals  /resources  /rescue-plan         │
│                                                                      │
│   ┌──────────────┐  ┌───────────────┐  ┌──────────────────────┐    │
│   │ Pydantic     │  │ Service Layer │  │ DB Repository Layer  │    │
│   │ Schemas      │  │ (Business     │  │ (mock_db.py →        │    │
│   │ (validation) │  │  Logic)       │  │  Supabase later)     │    │
│   └──────────────┘  └───────────────┘  └──────────────────────┘    │
└───────────────────────────────┬─────────────────────────────────────┘
                                │  Python function call
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   CREWAI AGENT ORCHESTRATOR                          │
│                                                                      │
│  [Disaster Intelligence] → [Incident Understanding]                 │
│       → [Survivor Probability] → [Medical Triage]                   │
│           → [Priority Agent] → [Resource Allocation]                │
│               → [Hospital Coordination] → [Risk Prediction]         │
│                   → [Communication Agent] → [Command Orchestrator]  │
│                                                                      │
│  LLM Provider (env-based):                                          │
│   OpenAI │ Gemini │ Ollama (local) │ LiteLLM proxy │ Mock          │
└───────────────────────────────┬─────────────────────────────────────┘
                                │  Read/Write
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   DATABASE (Supabase / PostgreSQL)                   │
│                                                                      │
│  incidents • hospitals • resources • users                          │
│  rescue_requests • agent_decisions • alert_logs                     │
│  audit_logs • disaster_risk_forecasts • historical_disasters        │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
          ┌──────────────┐  ┌──────┐  ┌──────────────────┐
          │  AWS S3      │  │ SNS  │  │  AWS Bedrock     │
          │  (storage)   │  │(SMS) │  │  (LLM fallback)  │
          └──────────────┘  └──────┘  └──────────────────┘
```

---

## Component Boundaries

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Responsibilities**: Display incidents, show rescue plans, provide incident submission form, map placeholder

### Backend
- **Framework**: FastAPI
- **Language**: Python 3.11
- **Responsibilities**: HTTP routing, request validation (Pydantic), triggering CrewAI, returning structured responses
- **Layers**: Router → Service → Repository (DB)

### Agent Layer
- **Framework**: CrewAI
- **Agents**: 10 specialized agents (see AGENTS.md)
- **LLM**: Provider-agnostic (configured via `LLM_PROVIDER` env var)
- **Output**: Structured rescue plan JSON

### Database
- **Technology**: PostgreSQL (hosted on Supabase for MVP, or RDS for AWS)
- **Local dev**: Docker Compose PostgreSQL container

### External Services (future)
- **Twilio**: SMS alerts to field teams
- **Amazon Connect**: Voice calls to hospitals
- **AWS Bedrock**: Production LLM hosting
- **Google Maps**: Interactive incident map

---

## Request Lifecycle

```
1. User submits incident on dashboard
         ↓
2. POST /api/v1/incidents
   FastAPI validates with Pydantic, stores in DB
         ↓
3. POST /api/v1/agents/execute { incident_id }
   Backend calls agent_service.run_crew(incident)
         ↓
4. CrewAI orchestrates 10 agents in sequence
   Each agent produces a structured output
         ↓
5. Command Orchestrator assembles final rescue plan JSON
         ↓
6. Plan stored in rescue_requests table
   Agent decisions logged in agent_decisions table
         ↓
7. Alert sent (mock in MVP, Twilio/SNS in production)
         ↓
8. Response returned to frontend: rescue plan + status
         ↓
9. Dashboard displays plan, map pins, resource list
```

---

## Security Considerations

- All secrets in environment variables (never hardcoded)
- AWS Secrets Manager for production credentials
- Supabase Row Level Security (RLS) for data isolation
- CORS locked to known origins via `CORS_ORIGINS` env var
- Audit logs written for every agent decision
