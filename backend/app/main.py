"""
Inbound Calling Agent - FastAPI Backend
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config.settings import get_settings
from app.config.logging_config import setup_logging


# Configure logging before anything else
setup_logging()
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    logger.info("Starting %s v%s", settings.app_name, "2.0.0")
    yield
    logger.info("Shutting down %s", settings.app_name)


app = FastAPI(
    title=settings.app_name,
    version="2.0.0",
    description="Multi-tenant AI-powered inbound calling agent platform",
    lifespan=lifespan,
)


# ── Global exception handlers ────────────────────────────────────────


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    """Return a clean JSON response for malformed requests."""
    errors = []
    for err in exc.errors():
        field = " → ".join(str(loc) for loc in err["loc"])
        errors.append(f"{field}: {err['msg']}")
    logger.warning("Validation error on %s %s: %s", request.method, request.url.path, errors)
    return JSONResponse(
        status_code=422,
        content={"error": "Validation error", "detail": errors},
    )


@app.exception_handler(Exception)
async def global_error_handler(request: Request, exc: Exception):
    """Catch-all handler so unhandled errors return JSON, not HTML tracebacks."""
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    detail = str(exc) if settings.debug else "An internal error occurred."
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": detail},
    )


# ── CORS middleware ──────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "service": settings.app_name}


# Register API routers
from app.api import companies, knowledge, agent

app.include_router(companies.router, prefix="/api/companies", tags=["companies"])
app.include_router(knowledge.router, prefix="/api/knowledge", tags=["knowledge"])
app.include_router(agent.router, prefix="/api/agent", tags=["agent"])

