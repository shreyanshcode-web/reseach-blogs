from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class ImageResponse(BaseModel):
    id: int
    is_explicit: bool
    moderation_score: float
    status: str
    created_at: datetime
    author_id: int
    view_url: str
    mime_type: str | None = None
    file_size: int | None = None
    width: int | None = None
    height: int | None = None

    model_config = {"from_attributes": True}


class DeepAIUploadResponse(BaseModel):
    image_id: int
    nsfw_score: float
    decision: str
    status: str
    strikes: Optional[int] = None
    banned: Optional[bool] = None
