"""
NSFW image moderation pipeline.

Uses the local HuggingFace model (Falconsai/nsfw_image_detection) via
the existing image_moderator module. No external API key required.

Components:
  - check_nsfw  : runs the local model on image bytes
  - decide      : 3-tier decision engine (BLOCK / REVIEW / ALLOW)
  - update_strikes : increments user strikes and auto-bans at ≥ 3
"""

import logging
import os
import shutil
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User

logger = logging.getLogger(__name__)


# ====== NSFW CHECK (local model) ======

def check_nsfw(image_bytes: bytes) -> float:
    """
    Run the local NSFW classifier on raw image bytes.

    Returns the nsfw_score (0.0 – 1.0).
    """
    from app.ml.image_moderator import image_moderator

    try:
        _processed_bytes, _is_nsfw, score = image_moderator.process_image(image_bytes)
    except Exception as exc:
        logger.error("NSFW check failed: %s", exc)
        score = 0.0

    return score


# ====== DECISION ENGINE ======

def decide(score: float) -> str:
    """
    Map an NSFW score to a moderation decision.

    Returns one of: "BLOCK", "REVIEW", "ALLOW".
    """
    if score > 0.85:
        return "BLOCK"
    elif score > 0.6:
        return "REVIEW"
    return "ALLOW"


# ====== STRIKE SYSTEM ======

async def update_strikes(user_id: int, db: AsyncSession) -> dict:
    """
    Increment moderation strikes for a user.

    When strikes reach 3, the user is auto-banned for 24 hours.
    Returns a dict with the current strike count and ban status.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        logger.warning("update_strikes called for non-existent user_id=%s", user_id)
        return {"strikes": 0, "banned": False}

    user.moderation_strikes += 1
    banned = False

    if user.moderation_strikes >= 3:
        user.banned_until = datetime.now(timezone.utc) + timedelta(days=1)
        banned = True
        logger.info(
            "User %s (id=%s) auto-banned until %s after %d strikes",
            user.username,
            user.id,
            user.banned_until.isoformat(),
            user.moderation_strikes,
        )

    await db.flush()
    return {"strikes": user.moderation_strikes, "banned": banned}


# ====== HELPERS ======

def save_upload(file, filename: str) -> str:
    """Save an UploadFile to the uploads/ directory, return the path."""
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file, buffer)
    return file_path
