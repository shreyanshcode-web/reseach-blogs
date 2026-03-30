from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel, Field


# ── Request schemas ──────────────────────────────────────────────

class PostCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: Any = Field(..., description="Can be text or a Notion-style JSON block array")
    published: bool = False


class PostUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[Any] = Field(None, description="Can be text or a Notion-style JSON block array")
    published: Optional[bool] = None


# ── Response schemas ─────────────────────────────────────────────

class AuthorBrief(BaseModel):
    id: int
    username: str

    model_config = {"from_attributes": True}


class PostResponse(BaseModel):
    id: int
    title: str
    content: Any
    published: bool
    moderation_status: str
    moderation_score: float | None = None
    view_count: int = 0
    unique_view_count: int = 0
    like_count: int = 0
    comment_count: int = 0
    share_count: int = 0
    bookmark_count: int = 0
    created_at: datetime
    updated_at: datetime
    author_id: int
    author: AuthorBrief

    model_config = {"from_attributes": True}


# ── Moderation schemas ───────────────────────────────────────────

class ModerationCheckRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Text to check for inappropriate content")


class ModerationCheckResponse(BaseModel):
    label: str
    confidence: float
    status: str
    reason: str
