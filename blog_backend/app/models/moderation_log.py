from datetime import datetime, timezone
from sqlalchemy import Integer, String, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base

class ModerationLog(Base):
    __tablename__ = "moderation_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    original_text: Mapped[str] = mapped_column(String, nullable=False)
    flagged_keywords: Mapped[list | dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    def __repr__(self) -> str:
        return f"<ModerationLog(id={self.id}, flagged_keywords_count={len(self.flagged_keywords)})>"
