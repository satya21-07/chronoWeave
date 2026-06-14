from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.database import engine, Base
from app.database import switch_to_sqlite_fallback
from app.routes import auth, projects, tasks, dependencies, analytics, ai
from app.websocket_manager import websocket_endpoint
from app.seed import seed_data
import logging
import os


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    try:
        logging.info("Initializing database and creating tables...")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logging.info("Database tables created successfully")
        await seed_data()
        logging.info("Database seeding completed")
    except Exception as exc:
        logging.exception("Failed to initialize database: %s. Attempting SQLite fallback...", exc)
        try:
            switch_to_sqlite_fallback()
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            await seed_data()
            logging.warning("Using SQLite fallback database for this session")
        except Exception as exc2:
            logging.exception("SQLite fallback also failed: %s. App will not have persistence.", exc2)
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
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])

# WebSocket
app.add_api_websocket_route("/ws/{project_id}", websocket_endpoint)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "FlowBoard API"}
