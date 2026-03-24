from datetime import datetime
from pydantic import BaseModel

class ImageResponse(BaseModel):
    id: int
    is_explicit: bool
    moderation_score: float
    status: str
    created_at: datetime
    author_id: int
    view_url: str

    model_config = {"from_attributes": True}
