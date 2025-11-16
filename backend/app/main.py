"""
Glam by Lynn - Main FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import engine, Base

# Import routers (will be added as we build them)
# from app.api.routes import auth, products, services, bookings, orders

# Database tables will be created via Alembic migrations
# Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Enterprise web application for makeup services and beauty product e-commerce",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/", tags=["Health"])
async def root():
    """Root endpoint - API health check"""
    return {
        "message": "Glam by Lynn API is running",
        "version": settings.APP_VERSION,
        "status": "healthy"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check endpoint"""
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT
    }


# Include routers (will be uncommented as we build them)
# app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
# app.include_router(products.router, prefix="/api/products", tags=["Products"])
# app.include_router(services.router, prefix="/api/services", tags=["Services"])
# app.include_router(bookings.router, prefix="/api/bookings", tags=["Bookings"])
# app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
