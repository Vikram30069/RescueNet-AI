# RescueNet AI — Recovery Guide

This document is the **primary save-point** for the project. If the session is interrupted, development pauses, or a service fails, use this guide to restore everything.

---

## 1. Where Is Everything?

| What | Location |
|---|---|
| All source code | `./backend/`, `./frontend/`, `./agents/` |
| Database schema | `./database/schema.sql` |
| Seed data | `./seed/seed.sql`, `./seed/seed_data.py` |
| Environment config | `.env` (copy from `.env.example`) |
| API docs | http://localhost:8000/docs (when server is running) |

---

## 2. Restore from Scratch

### Step 1 — Check environment
```bash
python --version   # Need 3.11+
node --version     # Need 18+
docker --version   # Optional
```

### Step 2 — Configure environment
```bash
cp .env.example .env
# Set at minimum:
#   LLM_PROVIDER=mock   (or openai / gemini / ollama)
#   DATABASE_URL=postgresql://...
```

### Step 3 — Restore backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Step 4 — Restore database (with Docker)
```bash
docker-compose up db -d
# Wait ~5 seconds for Postgres to start
# Schema and seed data auto-apply via docker-entrypoint-initdb.d/
```

### Step 5 — Restore database (manually)
```bash
psql -U rescuenet -d rescuenet -f database/schema.sql
psql -U rescuenet -d rescuenet -f seed/seed.sql
```

### Step 6 — Restore frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 3. LLM Provider Recovery

If the CrewAI agents fail to run:

| Symptom | Fix |
|---|---|
| `openai.AuthenticationError` | Set `OPENAI_API_KEY` in `.env` |
| `google.api_core.exceptions.Unauthenticated` | Set `GEMINI_API_KEY` in `.env` |
| Agents hanging | Switch to `LLM_PROVIDER=mock` for instant dry-run |
| No internet access | Install Ollama locally and set `LLM_PROVIDER=ollama` |

**Ollama quick install** (offline fallback):
```bash
# macOS/Linux
curl https://ollama.ai/install.sh | sh
ollama pull llama3
# Then set in .env:
# LLM_PROVIDER=ollama
# OLLAMA_BASE_URL=http://localhost:11434
# OLLAMA_MODEL=llama3
```

---

## 4. Verify Everything Is Working

```bash
# 1. Health check
curl http://localhost:8000/health

# 2. Submit a test incident
curl -X POST http://localhost:8000/api/v1/incidents \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Flood","type":"flood","location":"Mumbai","severity":3,"description":"Test"}'

# 3. Run agents on an incident
curl -X POST http://localhost:8000/api/v1/agents/execute \
  -H "Content-Type: application/json" \
  -d '{"incident_id":"demo-001"}'

# 4. Check hospitals
curl http://localhost:8000/api/v1/hospitals

# 5. Check resources
curl http://localhost:8000/api/v1/resources
```

---

## 5. Common Issues

| Issue | Solution |
|---|---|
| `ModuleNotFoundError: crewai` | Run `pip install -r requirements.txt` inside `backend/` |
| `CORS error` from frontend | Add frontend origin to `CORS_ORIGINS` in `.env` |
| Database connection refused | Ensure Docker is running or DATABASE_URL is correct |
| `next: command not found` | Run `npm install` inside `frontend/` |
| Port 8000 already in use | Kill the process: `lsof -ti:8000 \| xargs kill -9` |

---

## 6. File Checksums / Key Files to Backup

If only partial recovery is possible, prioritize these files:

1. `database/schema.sql` — Full DB structure
2. `agents/orchestrator.py` — Full agent flow
3. `backend/app/main.py` — API entry point
4. `.env` — Live credentials (never commit!)
5. `seed/seed.sql` — Demo data

---

## 7. Continuing Development

After recovery, see:
- [WORKFLOWS.md](./WORKFLOWS.md) for the full incident-to-alert flow
- [API_SPEC.md](./API_SPEC.md) for endpoint contracts
- [AGENTS.md](./AGENTS.md) for agent responsibilities
- [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
