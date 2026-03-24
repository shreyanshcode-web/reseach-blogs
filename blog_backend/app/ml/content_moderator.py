"""
ML-powered content moderation service using Google Gemini JSON Extraction.
Extracts specific invalid keywords (explicit/false news) to serve as a training database.
"""

import json
from dataclasses import dataclass
import google.generativeai as genai

from app.core.config import get_settings

settings = get_settings()

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)


@dataclass
class ModerationResult:
    """Result of content moderation check."""
    status: str                         # "approved" or "rejected"
    flagged_keywords: list[str]         # e.g ["kill", "fake claim"]
    suggestions: dict[str, str]         # e.g {"kill": "neutralize"}
    reason: str                         # Legacy compat


class ContentModerator:
    """Uses Gemini 1.5 Flash to extract keyword offenses."""

    def __init__(self):
        self.model = None

    def load_or_train(self) -> None:
        """Initialize the Gemini model interface."""
        if settings.GEMINI_API_KEY:
            self.model = genai.GenerativeModel("gemini-1.5-flash")

    def moderate(self, title: str, content: str) -> ModerationResult:
        if not self.model:
            # Fallback if API key missing
            return ModerationResult("approved", [], {}, "API key missing")

        combined_text = f"Title: {title}\nPost: {content}"
        
        prompt = (
            "You are a rigorous keyword extraction engine. Analyze the following text. "
            "Identify any explicit words, severely inappropriate NSFW terms, or definitively false news claims. "
            "Return ONLY a strictly valid JSON object matching this schema: "
            '{"is_inappropriate": true/false, "flagged_keywords": ["badword1", "fake claim"], "suggestions": {"badword1": "safe_word"}}. '
            "If is_inappropriate is false, the arrays can be empty."
            "\n\nText to analyze:\n" + combined_text
        )

        try:
            response = self.model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            data = json.loads(response.text)
            
            if data.get("is_inappropriate"):
                return ModerationResult(
                    status="rejected",
                    flagged_keywords=data.get("flagged_keywords", []),
                    suggestions=data.get("suggestions", {}),
                    reason="Inappropriate keywords or false claims detected."
                )
            else:
                return ModerationResult("approved", [], {}, "Clean")
        except Exception as e:
            # Drop open on network/parse error
            print(f"Gemini Moderation Error: {e}")
            return ModerationResult("approved", [], {}, "Error parsing")

moderator = ContentModerator()
