from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.models.models import Base, engine, SessionLocal
from app.api.auth import router as auth_router
from app.api.public import router as public_router
from app.api.authority import router as authority_router
from app.api.stream import router as stream_router
from app.api.operator import router as operator_router
from app.api.v1 import router as v1_router
from seed.seed import seed_database

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="FloodOps Multi-Agent Flood Response & Relief Coordination Backend",
    version="2.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for easy local dev & preview
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(v1_router, prefix="/api")
app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(public_router, prefix=settings.API_PREFIX)
app.include_router(authority_router, prefix=settings.API_PREFIX)
app.include_router(operator_router, prefix=settings.API_PREFIX)
app.include_router(stream_router, prefix=settings.API_PREFIX)

@app.get("/")
def root():
    return {
        "app": "FloodOps API",
        "status": "operational",
        "docs": "/docs",
        "district": settings.REGION_NAME
    }
