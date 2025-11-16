"""
Database configuration and session management
"""
import logging
from typing import Generator
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.pool import Pool
from app.core.config import settings

# Setup logging
logger = logging.getLogger(__name__)

# Create declarative base (SQLAlchemy 2.0 style)
Base = declarative_base()

# Create sync engine with optimized pool settings
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before using
    pool_size=10,  # Number of connections to maintain
    max_overflow=20,  # Max connections above pool_size
    pool_recycle=3600,  # Recycle connections after 1 hour
    echo=settings.DEBUG,  # Log SQL statements in debug mode
)


# Add connection event listeners for better logging
@event.listens_for(Pool, "connect")
def receive_connect(dbapi_conn, connection_record):
    """Log when a new database connection is created"""
    logger.info("New database connection established")


@event.listens_for(Pool, "checkout")
def receive_checkout(dbapi_conn, connection_record, connection_proxy):
    """Log when a connection is retrieved from the pool"""
    logger.debug("Connection checked out from pool")


# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False  # Prevent expiring objects on commit
)


def get_db() -> Generator[Session, None, None]:
    """
    Database session dependency for FastAPI routes

    Yields:
        Session: SQLAlchemy database session

    Example:
        @app.get("/users")
        def get_users(db: Session = Depends(get_db)):
            return db.query(User).all()
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def init_db() -> None:
    """
    Initialize database - create all tables
    This should only be used in development/testing
    For production, use Alembic migrations
    """
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")


def check_db_connection() -> bool:
    """
    Check if database connection is working

    Returns:
        bool: True if connection successful, False otherwise
    """
    try:
        from sqlalchemy import text
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        logger.info("Database connection check: SUCCESS")
        return True
    except Exception as e:
        logger.error(f"Database connection check: FAILED - {e}")
        return False
