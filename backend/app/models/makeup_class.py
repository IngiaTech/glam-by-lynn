"""Makeup class models for training courses and enrollments."""
from datetime import datetime
from uuid import uuid4

from sqlalchemy import (
    ARRAY,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class MakeupClass(Base):
    """Makeup training class/course definition."""

    __tablename__ = "makeup_classes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text)

    # Skill level: beginner, intermediate, advanced
    skill_level = Column(String(50), nullable=False, index=True)

    # Topic/category: bridal, everyday, special_effects, editorial, etc.
    topic = Column(String(100), nullable=False, index=True)

    # Duration in days (can be decimal for half days)
    duration_days = Column(Numeric(4, 1), nullable=False)

    # Price range (indicative, admin confirms final price)
    price_from = Column(Numeric(10, 2))
    price_to = Column(Numeric(10, 2))

    # What students will learn (array of strings)
    what_you_learn = Column(ARRAY(Text))

    # Prerequisites/requirements (array of strings)
    requirements = Column(ARRAY(Text))

    # Image for the class card
    image_url = Column(String(500))

    # Display settings
    is_active = Column(Boolean, default=True, index=True)
    is_featured = Column(Boolean, default=False, index=True)
    display_order = Column(Integer, default=0, index=True)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    enrollments = relationship(
        "ClassEnrollment", back_populates="makeup_class", lazy="dynamic"
    )

    __table_args__ = (
        CheckConstraint(
            "skill_level IN ('beginner', 'intermediate', 'advanced')",
            name="makeup_classes_skill_level_check",
        ),
        CheckConstraint(
            "topic IN ('bridal', 'everyday', 'special_effects', 'editorial', 'corrective', 'stage_theater', 'airbrush', 'contouring', 'eye_makeup', 'other')",
            name="makeup_classes_topic_check",
        ),
        CheckConstraint("duration_days > 0", name="makeup_classes_duration_check"),
        CheckConstraint(
            "price_from IS NULL OR price_from >= 0",
            name="makeup_classes_price_from_check",
        ),
        CheckConstraint(
            "price_to IS NULL OR price_to >= 0", name="makeup_classes_price_to_check"
        ),
        CheckConstraint(
            "price_to IS NULL OR price_from IS NULL OR price_to >= price_from",
            name="makeup_classes_price_range_check",
        ),
        Index("idx_makeup_classes_level_topic", "skill_level", "topic"),
    )

    def __repr__(self) -> str:
        return f"<MakeupClass(id={self.id}, title={self.title}, level={self.skill_level})>"


class ClassEnrollment(Base):
    """Student interest registration for makeup classes."""

    __tablename__ = "class_enrollments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    enrollment_number = Column(String(50), unique=True, nullable=False, index=True)

    # Class reference
    class_id = Column(
        UUID(as_uuid=True),
        ForeignKey("makeup_classes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Student info (can be guest or authenticated user)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(20), nullable=False)

    # Preferred dates (array of date strings they're available)
    preferred_dates = Column(ARRAY(Text))

    # Additional message/questions
    message = Column(Text)

    # Status tracking
    status = Column(String(30), nullable=False, default="pending", index=True)

    # Admin notes for internal tracking
    admin_notes = Column(Text)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    updated_at = Column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    makeup_class = relationship("MakeupClass", back_populates="enrollments")
    user = relationship("User", back_populates="class_enrollments")

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'contacted', 'confirmed', 'completed', 'cancelled')",
            name="class_enrollments_status_check",
        ),
        Index("idx_class_enrollments_class_status", "class_id", "status"),
    )

    def __repr__(self) -> str:
        return f"<ClassEnrollment(id={self.id}, enrollment_number={self.enrollment_number}, status={self.status})>"
