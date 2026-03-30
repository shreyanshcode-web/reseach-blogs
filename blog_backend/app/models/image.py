from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Image(Base):
    __tablename__ = "images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    original_path: Mapped[str] = mapped_column(String(500), nullable=False)
    blurred_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    original_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False, default="image/jpeg")
    file_size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # ML Prediction
    is_explicit: Mapped[bool] = mapped_column(Boolean, default=False)
    moderation_score: Mapped[float] = mapped_column(Float, default=0.0)

    # Status: 'safe', 'explicit', 'appealed', 'approved'
    status: Mapped[str] = mapped_column(String(20), default="safe", nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    author_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )

    author = relationship("User", backref="uploaded_images")

    def __repr__(self) -> str:
        return f"<Image(id={self.id}, status='{self.status}')>"
