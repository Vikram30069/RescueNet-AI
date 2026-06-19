"""
RescueNet AI — FastAPI Application Entrypoint
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import health, incidents, agents, hospitals, resources

# --- App instance ---
app = FastAPI(
    title="RescueNet AI",
    description="Multi-Agent Disaster Response & Survivor Prioritization System",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
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
app.include_router(hospitals.router, prefix="/api/v1", tags=["Hospitals"])
app.include_router(resources.router, prefix="/api/v1", tags=["Resources"])


@app.on_event("startup")
async def startup_event():
    print(f"[RescueNet AI] Starting up in '{settings.app_env}' mode")
    print(f"[RescueNet AI] LLM Provider: {settings.llm_provider}")
    print(f"[RescueNet AI] API docs: http://localhost:{settings.app_port}/docs")
