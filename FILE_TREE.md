# RescueNet AI — File Tree

Complete repository file structure as of initial creation. Use this as a map when recovering or continuing development.

```
rescuenet-ai/
│
├── .env.example                    # Environment variable template
├── .gitignore                      # Git ignore rules
├── docker-compose.yml              # Local dev: DB + backend + frontend
├── README.md                       # Main project entry point
│
├── ── DOCUMENTATION ──
├── RECOVERY_GUIDE.md               # ⚡ Start here if session interrupted
├── PROJECT_OVERVIEW.md             # Problem, features, MVP scope
├── ARCHITECTURE.md                 # System design + ASCII diagrams
├── AGENTS.md                       # All 10 CrewAI agent specs
├── DATABASE_SCHEMA.md              # PostgreSQL table definitions
├── API_SPEC.md                     # REST endpoint contracts
├── WORKFLOWS.md                    # Incident-to-alert workflow
├── AWS_DEPLOYMENT.md               # AWS architecture + deployment guide
├── FILE_TREE.md                    # This file
│
├── backend/                        # FastAPI Python server
│   ├── requirements.txt            # Python dependencies
│   ├── Dockerfile                  # Docker image for backend
│   ├── app/
│   │   ├── main.py                 # FastAPI entrypoint + router mounting
│   │   ├── core/
│   │   │   └── config.py           # Pydantic BaseSettings (env vars)
│   │   ├── schemas/
│   │   │   └── schemas.py          # Pydantic request/response models
│   │   ├── db/
│   │   │   └── mock_db.py          # Mock database (swap for Supabase later)
│   │   ├── routers/
│   │   │   ├── health.py           # GET /health
│   │   │   ├── incidents.py        # POST/GET /api/v1/incidents
│   │   │   ├── agents.py           # POST /api/v1/agents/execute
│   │   │   ├── hospitals.py        # GET /api/v1/hospitals
│   │   │   └── resources.py        # GET /api/v1/resources
│   │   └── services/
│   │       ├── incident_service.py # Business logic for incidents
│   │       └── agent_service.py    # Calls CrewAI orchestrator
│   └── tests/
│       ├── __init__.py
│       └── test_health.py          # Basic API smoke tests
│
├── agents/                         # CrewAI multi-agent layer
│   ├── __init__.py
│   ├── orchestrator.py             # Main crew setup + task execution
│   ├── config/
│   │   └── llm_config.py           # Provider-agnostic LLM selector
│   ├── definitions/                # One file per agent
│   │   ├── disaster_intelligence.py
│   │   ├── incident_understanding.py
│   │   ├── survivor_probability.py
│   │   ├── medical_triage.py
│   │   ├── priority_agent.py
│   │   ├── resource_allocation.py
│   │   ├── hospital_coordination.py
│   │   ├── communication_agent.py
│   │   ├── risk_prediction.py
│   │   └── command_orchestrator.py
│   └── tasks/
│       └── tasks.py                # Task definitions for each agent
│
├── database/
│   └── schema.sql                  # Full PostgreSQL DDL schema
│
├── seed/
│   ├── seed.sql                    # SQL demo data for all tables
│   └── seed_data.py                # Python mock data for local dev
│
├── frontend/                       # Next.js 14 App Router
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   ├── Dockerfile
│   └── src/
│       └── app/
│           ├── layout.tsx          # Root layout (fonts, metadata)
│           ├── page.tsx            # Main dashboard page
│           └── globals.css         # Global Tailwind styles
│
├── docs/
│   └── .gitkeep                    # Reserved for additional docs/diagrams
│
└── scripts/
    ├── run_backend.py              # Convenience: start FastAPI server
    └── run_agents.py               # Standalone agent pipeline test
```

---

## Priority Files to Preserve

If you can only save a few files, prioritize in this order:

| # | File | Why |
|---|---|---|
| 1 | `database/schema.sql` | Full DB structure |
| 2 | `agents/orchestrator.py` | Core agent pipeline |
| 3 | `backend/app/main.py` | API entry point |
| 4 | `.env.example` | Config reference |
| 5 | `seed/seed.sql` | Demo data for presentations |
| 6 | `RECOVERY_GUIDE.md` | How to restore everything |
