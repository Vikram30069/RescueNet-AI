"""
RescueNet AI — FastAPI Application Entrypoint
Run with: uvicorn app.main:app --reload --port 8000
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import health, incidents, agents, hospitals, resources


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"\n{'='*55}")
    print(f"  RescueNet AI v0.1.0 — {settings.app_env.upper()} mode")
    print(f"  LLM Provider : {settings.llm_provider}")
    print(f"  API Docs     : http://localhost:{settings.app_port}/docs")
    print(f"{'='*55}\n")
    yield
    # Shutdown (nothing to clean up for mock mode)


# --- App instance ---
app = FastAPI(
    title="RescueNet AI",
    description=(
        "Multi-Agent Disaster Response & Survivor Prioritization System. "
        "10 CrewAI agents collaborate to produce an actionable rescue plan "
        "from a raw incident report."
    ),
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# --- CORS middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Mount routers ---
app.include_router(health.router, tags=["Health"])
app.include_router(incidents.router, prefix="/api/v1", tags=["Incidents"])
app.include_router(agents.router, prefix="/api/v1", tags=["Agents"])
app.include_router(hospitals.router, prefix="/api/v1", tags=["Hospitals & Rescue Plans"])
app.include_router(resources.router, prefix="/api/v1", tags=["Resources"])
