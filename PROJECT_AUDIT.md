# RescueNet AI — Project Audit

**Audit Date:** 2026-06-20  
**Auditor:** Antigravity AI Analysis  
**Scope:** Full repository at `c:\Users\Lenovo\OneDrive\RescueNet-AI`  
**Note:** Read-only analysis. No code was modified.

---

## 1. Current Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     RescueNet AI                                │
│                                                                 │
│  ┌───────────────┐      HTTP       ┌─────────────────────────┐  │
│  │  Next.js 14   │ ◄──────────── │   FastAPI Backend        │  │
│  │  (Frontend)   │  localhost:8000│   (localhost:8000)       │  │
│  │  port :3000   │               │                          │  │
│  └───────────────┘               │  ┌──────────────────────┐│  │
│                                  │  │   Routers             ││  │
│                                  │  │  /health              ││  │
│                                  │  │  /api/v1/incidents    ││  │
│                                  │  │  /api/v1/agents       ││  │
│                                  │  │  /api/v1/hospitals    ││  │
│                                  │  │  /api/v1/resources    ││  │
│                                  │  └──────────┬───────────┘│  │
│                                  │             │             │  │
│                                  │  ┌──────────▼───────────┐│  │
│                                  │  │   agent_service.py    ││  │
│                                  │  │  (try/except bridge)  ││  │
│                                  │  └──────────┬───────────┘│  │
│                                  │             │             │  │
│                                  │  ┌──────────▼───────────┐│  │
│                                  │  │   mock_db.py          ││  │
│                                  │  │  (in-memory store)    ││  │
│                                  │  └──────────────────────┘│  │
│                                  └─────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  agents/ package                          │  │
│  │                                                           │  │
│  │   orchestrator.py → _run_mock_pipeline() [ACTIVE PATH]   │  │
│  │                   → _run_live_pipeline() [DORMANT PATH]  │  │
│  │                                                           │  │
│  │   definitions/  10 × CrewAI Agent shells (role + goal)   │  │
│  │   tasks/        10 × Task prompts (text only)            │  │
│  │   config/       llm_config.py (provider switcher)        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────┐   │
│  │ database/    │  │ seed/           │  │ docs/            │   │
│  │ schema.sql   │  │ seed.sql        │  │ (all markdown)   │   │
│  │ (PostgreSQL) │  │ seed_data.py    │  │                  │   │
│  │ NOT connected│  │ NOT executed    │  │                  │   │
│  └──────────────┘  └─────────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow (Current — Mock Mode)
```
User clicks incident → POST /api/v1/agents/execute
  → agents.py router → agent_service.run_crew(incident)
    → try: orchestrator.run_rescue_pipeline(incident)   ← fails (crewai not installed)
    → except: _build_mock_result(incident)              ← always executes
      → deterministic arithmetic on severity + type
      → returns structured RescuePlan JSON
  → mock_db.save_rescue_request() + save_agent_decision()
← 200 OK with full rescue plan
```

### Data Flow (Target — Live Mode)
```
POST /api/v1/agents/execute
  → agents.py → agent_service → orchestrator._run_live_pipeline(incident, llm)
    → CrewAI Crew(10 agents, 10 tasks, Process.sequential)
    → crew.kickoff() → LLM API calls × 10 agents
    → _parse_or_fallback(output) → JSON rescue plan
← 200 OK with AI-generated rescue plan
```

---

## 2. Fully Functional Components

These components work end-to-end with zero modifications required:

| Component | File(s) | Status | Evidence |
|---|---|---|---|
| FastAPI app startup | `backend/app/main.py` | ✅ **Fully functional** | Starts in <1s, serves on :8000 |
| Health endpoint | `backend/app/routers/health.py` | ✅ **Fully functional** | Returns `{status:ok}`, 200 |
| Incidents CRUD | `backend/app/routers/incidents.py` + `incident_service.py` | ✅ **Fully functional** | Create, list, filter, paginate, 404 |
| Hospitals query | `backend/app/routers/hospitals.py` | ✅ **Fully functional** | City/beds/specialization filter |
| Resources query | `backend/app/routers/resources.py` | ✅ **Fully functional** | Type/status filter |
| Mock DB (in-memory) | `backend/app/db/mock_db.py` | ✅ **Fully functional** | 5 incidents, 5 hospitals, 5 resources seeded |
| Pydantic schemas | `backend/app/schemas/schemas.py` | ✅ **Fully functional** | 14 models, all validated |
| Config/env loading | `backend/app/core/config.py` | ✅ **Functional** | Loads .env, has Pydantic v2 warning |
| pytest suite | `backend/tests/test_health.py` | ✅ **16/16 pass** | 0.94s, full coverage of all routes |
| Agent mock pipeline | `backend/app/services/agent_service.py` (`_build_mock_result`) | ✅ **Fully functional** | Deterministic, always returns valid plan |
| Orchestrator mock | `agents/orchestrator.py` (`_run_mock_pipeline`) | ✅ **Fully functional** | Same mock logic as above |
| LLM config switcher | `agents/config/llm_config.py` | ✅ **Fully functional** | Reads env var, returns None for mock |
| Next.js app | `frontend/src/app/` | ✅ **Compiles & serves** | 458 modules, `GET / 200 in 4150ms` |
| PostgreSQL schema | `database/schema.sql` | ✅ **Schema correct** | 8 tables, proper indexes, FK relations |
| Seed data SQL | `seed/seed.sql` | ✅ **Ready to apply** | Not yet executed |

---

## 3. Mock Implementations

These components exist but use fake/hardcoded data instead of real logic:

| Component | File | What's Mocked | What Real Would Be |
|---|---|---|---|
| **Database layer** | `backend/app/db/mock_db.py` | In-memory Python dicts | PostgreSQL via asyncpg/SQLAlchemy |
| **Agent pipeline (service)** | `backend/app/services/agent_service.py` | `_build_mock_result()` arithmetic | `run_rescue_pipeline()` with real LLM |
| **Agent pipeline (orchestrator)** | `agents/orchestrator.py` | `_run_mock_pipeline()` | `_run_live_pipeline()` via CrewAI |
| **Survivor probability** | Orchestrator mock | `0.45 + severity × 0.10` formula | Statistical model using population density, structural data |
| **Priority score** | Orchestrator mock | `severity / 5` | Multi-factor scoring: victims + time + resource availability |
| **Hospital routing** | Orchestrator mock | Always returns same 2 hardcoded hospitals | Real geospatial query from DB by distance + capacity |
| **Resource allocation** | Orchestrator mock | `severity × 2` ambulances formula | Query actual available resources from DB inventory |
| **Risk warnings** | Orchestrator mock | Static string lookup table by `inc_type` | ML model on meteorological + seismic data |
| **Alert messages** | Orchestrator mock | f-string templates | LLM-generated, contextually accurate messages |
| **Map in frontend** | `frontend/src/app/page.tsx` line 262 | `🗺️` placeholder div | Leaflet/Google Maps with incident pins |
| **Frontend plan display** | `page.tsx` lines 209, 225 | Reads `plan.survivor_estimate` and `plan.resources` | These keys don't match the real `RescuePlan` schema (mismatch!) |

> [!WARNING]
> **Schema Mismatch Found**: The frontend (`page.tsx` line 209) reads `plan.survivor_estimate` and `plan.resources`, but the FastAPI `RescuePlan` schema and `agent_service._build_mock_result` return `estimated_survivors` and `recommended_resources`. The frontend's rescue plan display panel is partially broken — the badges show `undefined` for survivors.

---

## 4. CrewAI Component Status

### What Exists (Placeholder Shell)
All 10 agent definition files exist at `agents/definitions/*.py` but they are **minimal shells** — each is ~23 lines containing only:
- `role` string
- `goal` string  
- `backstory` string
- `verbose=True, allow_delegation=False, llm=llm`

**No agent has:**
- Any `tools=[]` assignment
- Memory configuration
- Context passing between agents
- Output parsing / structured output enforcement
- Error handling for LLM failures

### Task Definitions (`agents/tasks/tasks.py`)
All 10 task functions exist and return a valid `crewai.Task` object. However:
- Tasks pass raw incident dict fields as **f-strings** — no structured context passing
- No `context=[previous_task]` chaining between tasks (agents don't read each other's outputs)
- `expected_output` is a plain English description, not a typed schema
- The final task (`assemble_rescue_plan_task`) asks the LLM to "return a complete rescue plan" but has no JSON schema enforcement

### Orchestrator Live Path (`_run_live_pipeline`)
The live pipeline path (lines 80–139 in `orchestrator.py`) is written and structurally correct but:
- `task.output` access pattern (`str(task.output)`) may not work in current CrewAI API (breaking change in v0.55+)
- `_parse_or_fallback()` tries naive `json.loads()` on LLM output — LLMs frequently don't return clean JSON
- No output schema (Pydantic model) is passed to CrewAI tasks to enforce structured output
- Agent decisions loop iterates `zip(agents.keys(), tasks)` but task outputs are not guaranteed to be populated before crew completes

---

## 5. Files That Must Be Modified for Real CrewAI Integration

Listed in dependency order (modify earlier items first):

### Phase 1 — Install & Wire (No logic changes)
| File | Change Required | Effort |
|---|---|---|
| `backend/requirements.txt` | Ensure stable install of `crewai>=0.55.0` and all langchain deps | Low |
| `.env` (create from `.env.example`) | Set `LLM_PROVIDER=gemini` (or openai/ollama) + API key | Trivial |

### Phase 2 — Fix Task Context Chaining
| File | Change Required | Effort |
|---|---|---|
| `agents/tasks/tasks.py` | Add `context=[previous_task]` to each task so agents receive prior outputs | Medium |
| `agents/tasks/tasks.py` | Add `output_json=RescuePlanPydanticModel` to final task for structured output | Medium |

### Phase 3 — Add Tools to Agents
| File | Change Required | Effort |
|---|---|---|
| `agents/definitions/disaster_intelligence.py` | Add `tools=[SerperDevTool()]` or weather API tool | Medium |
| `agents/definitions/survivor_probability.py` | Add population density lookup tool | High |
| `agents/definitions/hospital_coordination.py` | Add `tools=[db_query_tool]` to query real hospital DB | High |
| `agents/definitions/resource_allocation.py` | Add `tools=[db_query_tool]` to query real resource DB | High |
| `agents/definitions/risk_prediction.py` | Add weather/seismic data API tool | High |
| `agents/definitions/communication_agent.py` | Add Twilio/SNS SMS dispatch tool | Medium |

### Phase 4 — Fix LLM Output Parsing
| File | Change Required | Effort |
|---|---|---|
| `agents/orchestrator.py` | Replace naive `str(task.output)` with `task.output.raw` or `.json_dict` (CrewAI v0.55+ API) | Medium |
| `agents/orchestrator.py` | Robust JSON extraction from LLM output (use `json_repair` library) | Medium |
| `backend/app/services/agent_service.py` | Map CrewAI live output to `RescuePlan` Pydantic schema (currently only mock builds it correctly) | Medium |

### Phase 5 — Fix Schema Mismatch
| File | Change Required | Effort |
|---|---|---|
| `frontend/src/app/page.tsx` | Fix `plan.survivor_estimate` → `plan.estimated_survivors` | Trivial |
| `frontend/src/app/page.tsx` | Fix `plan.resources` → `plan.recommended_resources` | Trivial |
| `frontend/src/app/page.tsx` | Fix `plan.alert_messages` → `plan.alert_actions` | Trivial |

### Phase 6 — Database Integration
| File | Change Required | Effort |
|---|---|---|
| `backend/app/db/mock_db.py` | Replace with `backend/app/db/postgres_db.py` using asyncpg/SQLAlchemy | High |
| `backend/app/routers/*.py` | Update all `mock_db.*` imports to `postgres_db.*` | Low |
| `backend/app/core/config.py` | Fix `class Config` → `model_config = ConfigDict(...)` (Pydantic v2) | Low |

---

## 6. Risks of Replacing Mock Agents

| Risk | Severity | Description |
|---|---|---|
| **LLM Output Non-Determinism** | 🔴 HIGH | Real LLMs may return inconsistently formatted outputs. The current `_parse_or_fallback()` only tries simple `json.loads()`. A poorly formatted response will silently fall back to mock data — the caller won't know. |
| **LLM Latency** | 🔴 HIGH | GPT-4o averages 8–15 seconds per response. 10 sequential agents = **80–150 second total pipeline latency**. The FastAPI endpoint has no timeout and the frontend has no async polling. |
| **Context Loss Between Tasks** | 🟠 MEDIUM | Tasks currently have no `context=[]` linking. Agent 10 (Command Orchestrator) will not have access to Agent 1–9 outputs unless context chaining is implemented. Each agent effectively works in isolation. |
| **Token Cost** | 🟠 MEDIUM | 10 agents × ~1000 tokens each ≈ 10,000 tokens per pipeline run. At GPT-4o pricing (~$15/1M tokens), each rescue plan costs ~$0.15. High-volume use will be expensive. |
| **Test Coverage Break** | 🟠 MEDIUM | Current 16/16 tests all run in mock mode. Switching to live LLMs will break several test expectations (response time, exact output structure). New test fixtures needed. |
| **CrewAI API Instability** | 🟡 LOW-MEDIUM | CrewAI v0.55+ changed the `task.output` API. The live pipeline reads `str(task.output)` which may not work correctly. Needs verification against installed CrewAI version. |
| **Rate Limiting** | 🟡 LOW | Multiple concurrent incident executions will hit OpenAI/Gemini rate limits. No queue/throttle mechanism exists. |
| **Frontend Timeout** | 🟡 LOW | The frontend's `fetch()` call to `/agents/execute` has no timeout. A long-running LLM pipeline will leave the button spinning indefinitely. |

---

## 7. Recommended Implementation Order

### Sprint 1 — Foundation (1–2 days)
1. Fix Pydantic v2 warning (`ConfigDict`) in `app/core/config.py`
2. Fix `datetime.utcnow()` deprecation in `mock_db.py`
3. Fix frontend schema mismatch (`survivor_estimate`, `resources`, `alert_messages`)
4. Re-install `crewai` with a stable network connection
5. Verify `LLM_PROVIDER=gemini` path loads correctly end-to-end with a test API call

### Sprint 2 — Real CrewAI (2–3 days)
6. Add `context=[prev_task]` chaining to all 10 tasks in `tasks/tasks.py`
7. Add `output_pydantic=RescuePlan` to the final assemble task
8. Fix orchestrator output parsing (`task.output.raw` / `task.output.json_dict`)
9. Map live CrewAI output to `RescuePlan` in `agent_service.py`
10. Test with `LLM_PROVIDER=gemini` on the demo-001 incident

### Sprint 3 — Agent Tools (3–5 days)
11. Add DB query tools to Resource Allocation and Hospital Coordination agents
12. Add weather/news API tool (SerperDevTool or custom) to Risk Prediction agent
13. Add SMS dispatch tool (Twilio) to Communication agent
14. Validate each agent independently before wiring back to crew

### Sprint 4 — Database (3–4 days)
15. Set up PostgreSQL (local Docker or Supabase)
16. Apply `database/schema.sql` and `seed/seed.sql`
17. Implement `backend/app/db/postgres_db.py` with asyncpg
18. Swap all router imports from `mock_db` to `postgres_db`
19. Update tests to use a test PostgreSQL instance

### Sprint 5 — Frontend & UX (3–5 days)
20. Add Leaflet map with incident pins
21. Add WebSocket endpoint for real-time agent progress streaming
22. Build per-agent step progress UI (show each of 10 agents completing)
23. Add incident creation form

### Sprint 6 — Auth & Deployment (3–5 days)
24. Implement JWT auth middleware
25. Add user roles (Operator, Commander, Admin)
26. Configure Docker Compose with PostgreSQL service
27. Deploy to AWS ECS per `AWS_DEPLOYMENT.md`

---

## 8. Estimated Completion Percentage by Subsystem

| Subsystem | Completion | Notes |
|---|---|---|
| **Documentation** | 95% | All 10 docs complete. Minor updates needed post-implementation. |
| **Project Scaffolding / Structure** | 100% | Directory layout, .gitignore, .env.example, Dockerfiles all present. |
| **FastAPI Backend (routes + schemas)** | 90% | All 5 routers work. Missing: auth middleware, async DB, rate limiting. |
| **Mock Database (`mock_db.py`)** | 100% | Fully functional for local dev. Not intended for production. |
| **PostgreSQL Schema** | 80% | Schema designed and correct. Missing: connection layer, migration tooling, seed execution. |
| **Agent Definitions (structure)** | 60% | 10 shell agents exist with correct role/goal. Missing: tools, memory, context. |
| **Agent Tasks** | 50% | 10 task prompts written. Missing: context chaining, output schema enforcement. |
| **Agent Orchestrator (mock path)** | 100% | Fully functional and tested. |
| **Agent Orchestrator (live path)** | 30% | Code exists but untested. Output parsing is fragile. crewAI not installed. |
| **LLM Config** | 85% | All 5 providers configured. Missing: validation of API key presence before call. |
| **Frontend Dashboard** | 35% | App renders, loads incidents, has run-agents button. Missing: schema fix, map, real-time updates, auth, form inputs. |
| **Testing** | 55% | 16 unit/integration tests cover mock paths. Missing: live LLM tests, DB tests, frontend E2E. |
| **Authentication / Authorization** | 0% | Schema has `users` table. No auth code exists anywhere. |
| **Alert / Notification Dispatch** | 5% | `.env.example` has Twilio/SNS keys. No actual dispatch code. |
| **Maps Integration** | 0% | Placeholder `🗺️` div in frontend. No map library installed. |
| **Docker Compose (multi-service)** | 70% | `docker-compose.yml` exists with backend + frontend. Missing: PostgreSQL service. |
| **Cloud Deployment (AWS)** | 10% | `AWS_DEPLOYMENT.md` guide written. No infrastructure provisioned. |
| **Overall Project** | **~52%** | Solid backend MVP + mock pipeline. Real AI agents and DB are the primary gap. |
