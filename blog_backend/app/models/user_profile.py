from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class UserProfile(Base):
    """Extended user profile for portfolio — one-to-one with User."""
    __tablename__ = "user_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )

    # Basic info
    display_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    tagline: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Media
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cover_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Location & Contact
    location: Mapped[str | None] = mapped_column(String(100), nullable=True)
    website_url: Mapped[str | None] = mapped_column(String(300), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Social Links
    github_url: Mapped[str | None] = mapped_column(String(300), nullable=True)
    twitter_url: Mapped[str | None] = mapped_column(String(300), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(300), nullable=True)
    instagram_url: Mapped[str | None] = mapped_column(String(300), nullable=True)
    youtube_url: Mapped[str | None] = mapped_column(String(300), nullable=True)

    # Portfolio Data (stored as JSON arrays)
    skills: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # e.g. ["Python", "React", "WebGL", "FastAPI"]

    experience: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # e.g. [{"company": "Google", "role": "SWE", "from": "2022", "to": "2024", "description": "..."}]

    education: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # e.g. [{"institution": "MIT", "degree": "BS CS", "year": "2022"}]

    certifications: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # e.g. [{"name": "AWS Solutions Architect", "issuer": "Amazon", "year": "2023"}]

    projects: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # e.g. [{"name": "Blog Platform", "url": "https://...", "description": "..."}]

    # Timestamps
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationship
    user = relationship("User", back_populates="profile")
