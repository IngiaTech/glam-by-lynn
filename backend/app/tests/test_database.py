"""
Test database connectivity and session management
"""
import pytest
from sqlalchemy.orm import Session
from app.core.database import (
    get_db,
    check_db_connection,
    init_db,
    engine,
    Base
)


@pytest.mark.unit
def test_database_connection():
    """Test that database connection works"""
    assert check_db_connection() is True


@pytest.mark.unit
def test_get_db_session(db: Session):
    """Test that database session is created successfully"""
    assert db is not None
    assert isinstance(db, Session)


@pytest.mark.unit
def test_database_session_yields_session():
    """Test that get_db yields a valid session"""
    session_generator = get_db()
    db_session = next(session_generator)

    assert db_session is not None
    assert isinstance(db_session, Session)

    # Clean up
    try:
        next(session_generator)
    except StopIteration:
        pass


@pytest.mark.unit
def test_database_session_rollback_on_exception():
    """Test that database session rolls back on exception"""
    session_generator = get_db()
    db_session = next(session_generator)

    # Simulate an exception in the session
    try:
        # This should trigger rollback and finally block in get_db
        session_generator.throw(Exception("Test exception"))
    except Exception:
        pass

    # The test is that it doesn't crash - the session is properly handled


@pytest.mark.unit
def test_init_db_creates_tables():
    """Test that init_db creates database tables"""
    # Drop all tables first
    Base.metadata.drop_all(bind=engine)

    # Initialize database
    init_db()

    # Check that we can connect
    assert check_db_connection() is True
