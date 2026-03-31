from datetime import datetime

from pydantic import BaseModel

from app.schemas.post_schema import PostResponse


class HomeTimelineResponse(BaseModel):
    posts: list[PostResponse]
    source: str
    personalized: bool
    cached: bool
    delivery_model: str
    generated_at: datetime
