"""Health check router."""

from fastapi import APIRouter
from app.schemas.schemas import HealthResponse
from app.core.config import settings

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Returns API health status. Use this to verify the server is running."""
    return HealthResponse(
        status="ok",
        version="0.1.0",
        environment=settings.app_env,
        llm_provider=settings.llm_provider,
    )
