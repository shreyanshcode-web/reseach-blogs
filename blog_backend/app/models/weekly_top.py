from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class WeeklyTopPost(Base):
    """
    Stores the top-performing blog posts for each week.
    Ranked by engagement score = likes + (shares * 2) + bookmarks.
    Recalculated via POST /api/analytics/weekly-top/compute.
    """
    __tablename__ = "weekly_top_posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    post_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    week_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    week_end: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
    likes: Mapped[int] = mapped_column(Integer, default=0)
    shares: Mapped[int] = mapped_column(Integer, default=0)
    bookmarks: Mapped[int] = mapped_column(Integer, default=0)
    total_views: Mapped[int] = mapped_column(Integer, default=0)
    engagement_score: Mapped[float] = mapped_column(Float, default=0.0)
    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    post = relationship("Post", backref="weekly_rankings")

    def __repr__(self) -> str:
        return f"<WeeklyTopPost(rank={self.rank}, post_id={self.post_id}, score={self.engagement_score})>"
