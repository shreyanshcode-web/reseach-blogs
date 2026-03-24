"""
ML Training Data models — stored in the separate ml_training.db.
These tables feed the content moderation classifier.
"""
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.ml_database import MLBase


class TrainingSample(MLBase):
    """
    Individual text sample used to train the content moderation classifier.
    Labelled as 'appropriate' or 'inappropriate'.
    """
    __tablename__ = "training_samples"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    label: Mapped[str] = mapped_column(
        String(20), nullable=False, index=True
    )  # "appropriate" or "inappropriate"
    source: Mapped[str] = mapped_column(
        String(50), default="manual", index=True
    )  # "manual", "moderation_feedback", "bulk_import", "auto_labeled"
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_validated: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class TrainingKeyword(MLBase):
    """
    Known bad keywords/phrases that the classifier should flag.
    Used to build a profanity/misinformation filter.
    """
    __tablename__ = "training_keywords"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    keyword: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    category: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # "explicit", "violence", "misinformation", "spam", "hate_speech"
    severity: Mapped[str] = mapped_column(
        String(20), default="medium"
    )  # "low", "medium", "high", "critical"
    suggestion: Mapped[str | None] = mapped_column(String(200), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class ModelVersion(MLBase):
    """
    Tracks each trained model version with its accuracy and metadata.
    """
    __tablename__ = "model_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    version: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    accuracy: Mapped[float | None] = mapped_column(Float, nullable=True)
    precision_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    recall_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    f1_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    sample_count: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    trained_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
