# RescueNet AI

**Multi-Agent Disaster Response & Survivor Prioritization System**

> A hackathon MVP that coordinates AI agents to identify disasters, prioritize survivors, match resources and hospitals, and generate actionable rescue plans — all in near real-time.

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose (optional but recommended)
- An LLM provider key (or use `LLM_PROVIDER=mock` for offline runs)

### 1. Clone and configure
```bash
git clone https://github.com/your-org/rescuenet-ai.git
cd rescuenet-ai
cp .env.example .env
# Edit .env and fill in at minimum: LLM_PROVIDER, DATABASE_URL
```

### 2. Run with Docker (easiest)
```bash
docker-compose up --build
```
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Frontend**: http://localhost:3000

### 3. Run manually

**Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

**Agents (standalone test)**
```bash
python scripts/run_agents.py
```

---

## Repository Structure

```
rescuenet-ai/
  frontend/        → Next.js App Router (TypeScript, Tailwind)
  backend/         → FastAPI Python server
  agents/          → CrewAI multi-agent orchestration layer
  database/        → SQL schema files
  docs/            → Additional documentation and diagrams
  scripts/         → Developer utility scripts
  seed/            → Demo seed data (SQL + Python)
  .env.example     → Environment variable template
  docker-compose.yml
```

See [FILE_TREE.md](./FILE_TREE.md) for the full file listing.

---

## Key Documents

| File | Purpose |
|---|---|
| [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) | Problem, features, roadmap |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design and diagrams |
| [AGENTS.md](./AGENTS.md) | All 10 CrewAI agent specs |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | PostgreSQL table definitions |
| [API_SPEC.md](./API_SPEC.md) | REST endpoint contracts |
| [WORKFLOWS.md](./WORKFLOWS.md) | End-to-end incident workflow |
| [AWS_DEPLOYMENT.md](./AWS_DEPLOYMENT.md) | Deployment architecture |
| [RECOVERY_GUIDE.md](./RECOVERY_GUIDE.md) | How to restore and recover |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.11, Pydantic v2 |
| Agents | CrewAI (multi-provider: OpenAI / Gemini / Ollama / LiteLLM) |
| Database | Supabase / PostgreSQL |
| Maps | Google Maps API (or placeholder component) |
| Deployment | AWS (ECS, RDS, S3, CloudFront, Bedrock, SNS) |
| Optional | Twilio, Amazon Connect, AWS Bedrock |

---

## Health Check
```
GET http://localhost:8000/health
→ { "status": "ok", "version": "0.1.0" }
```

---

## License
MIT — Built for hackathon purposes.
