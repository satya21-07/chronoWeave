from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.database import engine, Base
from app.routes import auth, projects, tasks, dependencies, analytics
from app.websocket_manager import websocket_endpoint
from app.seed import seed_data
from sqlalchemy.engine.url import make_url
import logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await seed_data()
    except Exception as exc:
        # Try to provide a clear diagnostic in logs for Render
        try:
            url = make_url(str(app.state.settings.DATABASE_URL)) if hasattr(app, "state") and getattr(app.state, "settings", None) else make_url("" if not hasattr(__import__("app.config"), "settings") else __import__("app.config").settings.DATABASE_URL)
            host = url.host
        except Exception:
            host = None
        logging.exception("Database connection failed. Attempted host: %s. Error: %s", host, exc)
        raise
    yield
    await engine.dispose()


app = FastAPI(
    title="FlowBoard API",
    description="Visual Task Dependency Manager",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    """Return detailed validation errors for debugging"""
    errors = []
    for error in exc.errors():
        errors.append({
            "loc": error.get("loc"),
            "msg": error.get("msg"),
            "type": error.get("type"),
        })
    return JSONResponse(
        status_code=422,
        content={"detail": errors},
    )

# REST Routes
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["Tasks"])
app.include_router(dependencies.router, prefix="/api/dependencies", tags=["Dependencies"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])

# WebSocket
app.add_api_websocket_route("/ws/{project_id}", websocket_endpoint)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "FlowBoard API"}
