from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog
from core.orchestrator.orchestrator import Orchestrator
from api.routes import goals, tasks, agents, approvals, monitoring

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

app = FastAPI(
    title="Executive Agent Platform",
    description="Autonomous Operational Infrastructure Platform",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize core components
orchestrator = Orchestrator()
app.state.orchestrator = orchestrator

# Include routers
app.include_router(goals.router, prefix="/api/v1/goals", tags=["goals"])
app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["tasks"])
app.include_router(agents.router, prefix="/api/v1/agents", tags=["agents"])
app.include_router(approvals.router, prefix="/api/v1/approvals", tags=["approvals"])
app.include_router(monitoring.router, prefix="/api/v1/monitoring", tags=["monitoring"])

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.on_event("startup")
async def startup_event():
    # Initialize database connections, temporal client, and orchestrator agents if possible.
    try:
        await app.state.orchestrator.initialize()
    except Exception as exc:
        logger = structlog.get_logger()
        logger.warning("Startup initialization failed", error=str(exc))

@app.on_event("shutdown")
async def shutdown_event():
    # Cleanup resources
    if hasattr(app.state.orchestrator, 'worker') and app.state.orchestrator.worker is not None:
        try:
            await app.state.orchestrator.worker.shutdown()
        except Exception:
            pass
