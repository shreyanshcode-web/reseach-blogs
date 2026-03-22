from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── Request schemas ──────────────────────────────────────────────

class PostCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    published: bool = False


class PostUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1)
    published: Optional[bool] = None


# ── Response schemas ─────────────────────────────────────────────

class AuthorBrief(BaseModel):
    id: int
    username: str

    model_config = {"from_attributes": True}


class PostResponse(BaseModel):
    id: int
    title: str
    content: str
    published: bool
    moderation_status: str
    moderation_score: float | None = None
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
