from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, Field


# ── Request Schemas ──────────────────────────────────────────────

class ProfileUpdate(BaseModel):
    """All fields optional for PATCH-style updates."""
    display_name: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = None
    tagline: Optional[str] = Field(None, max_length=200)
    avatar_url: Optional[str] = Field(None, max_length=500)
    cover_image_url: Optional[str] = Field(None, max_length=500)
    location: Optional[str] = Field(None, max_length=100)
    website_url: Optional[str] = Field(None, max_length=300)
    phone: Optional[str] = Field(None, max_length=20)
    github_url: Optional[str] = Field(None, max_length=300)
    twitter_url: Optional[str] = Field(None, max_length=300)
    linkedin_url: Optional[str] = Field(None, max_length=300)
    instagram_url: Optional[str] = Field(None, max_length=300)
    youtube_url: Optional[str] = Field(None, max_length=300)
    skills: Optional[List[str]] = None
    experience: Optional[List[Any]] = None
    education: Optional[List[Any]] = None
    certifications: Optional[List[Any]] = None
    projects: Optional[List[Any]] = None


# ── Response Schemas ─────────────────────────────────────────────

class ProfileResponse(BaseModel):
    user_id: int
    username: str
    email: str
    display_name: str | None = None
    bio: str | None = None
    tagline: str | None = None
    avatar_url: str | None = None
    cover_image_url: str | None = None
    location: str | None = None
    website_url: str | None = None
    phone: str | None = None
    github_url: str | None = None
    twitter_url: str | None = None
    linkedin_url: str | None = None
    instagram_url: str | None = None
    youtube_url: str | None = None
    skills: list | None = None
    experience: list | None = None
    education: list | None = None
    certifications: list | None = None
    projects: list | None = None
    total_posts: int = 0
    followers_count: int = 0
    following_count: int = 0
    member_since: str = ""


class PublicPortfolioResponse(BaseModel):
    user_id: int
    username: str
    display_name: str | None = None
    bio: str | None = None
    tagline: str | None = None
    avatar_url: str | None = None
    cover_image_url: str | None = None
    location: str | None = None
    website_url: str | None = None
    github_url: str | None = None
    twitter_url: str | None = None
    linkedin_url: str | None = None
    instagram_url: str | None = None
    youtube_url: str | None = None
    skills: list | None = None
    experience: list | None = None
    education: list | None = None
    certifications: list | None = None
    projects: list | None = None
    total_posts: int = 0
    followers_count: int = 0
    following_count: int = 0
    member_since: str = ""
    recent_posts: list = []
