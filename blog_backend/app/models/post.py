from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, String, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Post(Base):
    __tablename__ = "posts"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_posts_slug"),
        Index("ix_posts_author_created", "author_id", "created_at"),
        Index("ix_posts_tags", "tags"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(240), unique=True, index=True, nullable=False)
    content: Mapped[list | dict | str] = mapped_column(JSON, nullable=False)
    tags: Mapped[list | None] = mapped_column(JSON, nullable=True, default=list)
    published: Mapped[bool] = mapped_column(Boolean, default=False)
    moderation_status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False
    )
    moderation_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False, index=True)
    unique_view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    like_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False, index=True)
    comment_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    share_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    bookmark_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_suspended: Mapped[bool] = mapped_column(Boolean, default=False)
    suspended_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    author_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )

    author = relationship("User", back_populates="posts")

    def __repr__(self) -> str:
        return f"<Post(id={self.id}, title='{self.title}')>"
