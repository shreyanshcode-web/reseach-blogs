from typing import Optional

from pydantic import BaseModel, Field


# ── Admin Request Schemas ────────────────────────────────────────

class AdminSuspendUser(BaseModel):
    reason: str = Field(..., min_length=1, max_length=500, description="Reason for suspending the user")


class AdminSuspendPost(BaseModel):
    reason: str = Field(..., min_length=1, max_length=500, description="Reason for suspending the post")


class AdminUpdatePostStatus(BaseModel):
    moderation_status: str = Field(..., description="New moderation status: approved, rejected, pending")


class AdminPromoteUser(BaseModel):
    is_admin: bool = Field(..., description="Set to true to promote, false to demote")


# ── Admin Response Schemas ───────────────────────────────────────

class AdminUserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    is_verified: bool
    is_admin: bool
    is_suspended: bool
    suspended_reason: str | None = None
    created_at: str  # ISO format
    post_count: int = 0

    model_config = {"from_attributes": True}


class AdminPostResponse(BaseModel):
    id: int
    title: str
    published: bool
    moderation_status: str
    moderation_score: float | None = None
    is_suspended: bool
    suspended_reason: str | None = None
    created_at: str
    updated_at: str
    author_id: int
    author_username: str = ""

    model_config = {"from_attributes": True}


class AdminDashboardStats(BaseModel):
    total_users: int
    total_posts: int
    suspended_users: int
    suspended_posts: int
    pending_posts: int
    approved_posts: int
    rejected_posts: int
    admin_count: int
