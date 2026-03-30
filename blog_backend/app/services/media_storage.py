from __future__ import annotations

import os
import uuid
from pathlib import Path

from app.core.config import get_settings


settings = get_settings()
MEDIA_ROOT = Path(settings.MEDIA_ROOT).resolve()
ORIGINALS_DIR = MEDIA_ROOT / "images" / "original"
BLURRED_DIR = MEDIA_ROOT / "images" / "blurred"


def ensure_media_dirs() -> None:
    ORIGINALS_DIR.mkdir(parents=True, exist_ok=True)
    BLURRED_DIR.mkdir(parents=True, exist_ok=True)


def _safe_extension(filename: str | None, content_type: str | None) -> str:
    if filename:
        ext = Path(filename).suffix.lower()
        if ext:
            return ext
    mime_to_ext = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
        "image/webp": ".webp",
    }
    return mime_to_ext.get(content_type or "", ".bin")


def save_media_file(data: bytes, *, filename: str | None, content_type: str | None, blurred: bool = False) -> str:
    ensure_media_dirs()
    ext = _safe_extension(filename, content_type)
    target_dir = BLURRED_DIR if blurred else ORIGINALS_DIR
    file_name = f"{uuid.uuid4().hex}{ext}"
    file_path = target_dir / file_name
    file_path.write_bytes(data)
    return os.fspath(file_path)

