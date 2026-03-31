from datetime import datetime

from pydantic import BaseModel


class FollowUserResponse(BaseModel):
    id: int
    username: str

    model_config = {"from_attributes": True}


class FollowStatusResponse(BaseModel):
    target_user_id: int
    is_following: bool
    followers_count: int
    following_count: int


class FollowListResponse(BaseModel):
    users: list[FollowUserResponse]


class FollowActionResponse(BaseModel):
    detail: str
    target_user_id: int
    created_at: datetime | None = None
