"""
ML-powered content moderation service.
Uses a locally trained TF-IDF ensemble model (primary),
with Google Gemini JSON extraction as a fallback / secondary layer.
"""

import json
import os
import pickle
import re
from dataclasses import dataclass

import google.generativeai as genai
from scipy.sparse import hstack

from app.core.config import get_settings

settings = get_settings()

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

# Paths to trained model artifacts
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "content_classifier.pkl")
VECTORIZER_PATH = os.path.join(MODEL_DIR, "tfidf_vectorizer.pkl")
CHAR_VECTORIZER_PATH = os.path.join(MODEL_DIR, "tfidf_char_vectorizer.pkl")

# Slang map (same as training)
SLANG_MAP = {
    "u": "you", "ur": "your", "r": "are", "y": "why",
    "n": "and", "b": "be", "bc": "because", "cuz": "because",
    "da": "the", "dat": "that", "dis": "this", "dem": "them",
    "dey": "they", "doe": "though", "tho": "though",
    "af": "as fuck", "asf": "as fuck", "asl": "as hell",
    "smh": "shaking my head", "foh": "fuck outta here",
    "lmao": "laughing", "lmfao": "laughing", "lol": "laughing",
    "stfu": "shut the fuck up", "gtfo": "get the fuck out",
    "fml": "fuck my life", "wtf": "what the fuck",
    "tbh": "to be honest", "imo": "in my opinion",
    "ngl": "not gonna lie", "idc": "i dont care",
    "idgaf": "i dont give a fuck", "idk": "i dont know",
    "bruh": "bro", "fam": "family", "yall": "you all",
    "ima": "i am going to", "imma": "i am going to",
    "tryna": "trying to", "finna": "going to",
    "prolly": "probably", "nah": "no",
}


@dataclass
class ModerationResult:
    """Result of content moderation check."""
    status: str                         # "approved", "rejected", "flagged"
    flagged_keywords: list[str]         # e.g ["kill", "fake claim"]
    suggestions: dict[str, str]         # e.g {"kill": "neutralize"}
    reason: str                         # Human-readable reason
    confidence: float = 0.0             # Model confidence score


def clean_text(text: str) -> str:
    """Same cleaning as used during training, including slang expansion."""
    text = re.sub(r"http\S+|www\S+", "", text)
    text = re.sub(r"@\w+", "", text)
    text = re.sub(r"#(\w+)", r"\1", text)
    text = re.sub(r"RT\s*", "", text)
    text = re.sub(r"&amp;|&#\d+;", " ", text)
    text = re.sub(r"[^a-zA-Z\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip().lower()

    words = text.split()
    expanded = [SLANG_MAP.get(w, w) for w in words]
    text = " ".join(expanded)
    text = re.sub(r"(.)\1{2,}", r"\1\1", text)
    return text.strip()


class ContentModerator:
    """
    Two-stage moderation:
    1. Local dual-TF-IDF ensemble (fast, offline)
    2. Gemini API for keyword extraction (if available)
    """

    def __init__(self):
        self.model = None
        self.word_vectorizer = None
        self.char_vectorizer = None
        self.gemini_model = None

    def load_or_train(self) -> None:
        """Load the trained local model and initialize Gemini."""
        # Load local ML model + both vectorizers
        if os.path.exists(MODEL_PATH) and os.path.exists(VECTORIZER_PATH):
            with open(MODEL_PATH, "rb") as f:
                self.model = pickle.load(f)
            with open(VECTORIZER_PATH, "rb") as f:
                self.word_vectorizer = pickle.load(f)
            if os.path.exists(CHAR_VECTORIZER_PATH):
                with open(CHAR_VECTORIZER_PATH, "rb") as f:
                    self.char_vectorizer = pickle.load(f)
            print("✅ Local ML ensemble loaded (word + char TF-IDF)")
        else:
            print("⚠️  No trained model found. Run: python -m app.ml.train_from_csv")

        # Initialize Gemini as secondary layer
        if settings.GEMINI_API_KEY:
            self.gemini_model = genai.GenerativeModel("gemini-1.5-flash")
            print("✅ Gemini API initialized as secondary moderation layer")

    def _local_predict(self, text: str) -> tuple[str, float]:
        """Run the local dual-TF-IDF ensemble. Returns (label, confidence)."""
        if not self.model or not self.word_vectorizer:
            return "approved", 0.0

        cleaned = clean_text(text)
        if len(cleaned) < 3:
            return "approved", 1.0

        X_word = self.word_vectorizer.transform([cleaned])
        if self.char_vectorizer:
            X_char = self.char_vectorizer.transform([cleaned])
            X = hstack([X_word, X_char])
        else:
            X = X_word

        prediction = self.model.predict(X)[0]
        probabilities = self.model.predict_proba(X)[0]
        confidence = max(probabilities)

        return prediction, confidence

    def _gemini_extract(self, title: str, content: str) -> dict:
        """Use Gemini to extract specific bad keywords."""
        if not self.gemini_model:
            return {"is_inappropriate": False, "flagged_keywords": [], "suggestions": {}}

        combined = f"Title: {title}\nPost: {content}"
        prompt = (
            "You are a rigorous keyword extraction engine. Analyze the following text. "
            "Identify any explicit words, severely inappropriate NSFW terms, or definitively false news claims. "
            "Return ONLY a strictly valid JSON object matching this schema: "
            '{"is_inappropriate": true/false, "flagged_keywords": ["badword1", "fake claim"], "suggestions": {"badword1": "safe_word"}}. '
            "If is_inappropriate is false, the arrays can be empty."
            "\n\nText to analyze:\n" + combined
        )

        try:
            response = self.gemini_model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"},
            )
            return json.loads(response.text)
        except Exception as e:
            print(f"Gemini Moderation Error: {e}")
            return {"is_inappropriate": False, "flagged_keywords": [], "suggestions": {}}

    def moderate(self, title: str, content: str) -> ModerationResult:
        """
        Two-stage moderation:
        1. Local model classifies as appropriate/inappropriate
        2. If inappropriate OR confidence is low, Gemini extracts keywords
        """
        combined = f"{title} {content}"

        # Stage 1: Local ML model
        local_label, confidence = self._local_predict(combined)

        if local_label == "appropriate" and confidence > 0.85:
            # High-confidence clean — skip Gemini
            return ModerationResult(
                status="approved",
                flagged_keywords=[],
                suggestions={},
                reason="Clean (local ML)",
                confidence=confidence,
            )

        if local_label == "inappropriate" and confidence > 0.90:
            # High-confidence bad — use Gemini for keyword details
            gemini_data = self._gemini_extract(title, content)
            return ModerationResult(
                status="rejected",
                flagged_keywords=gemini_data.get("flagged_keywords", []),
                suggestions=gemini_data.get("suggestions", {}),
                reason="Inappropriate content detected by ML model",
                confidence=confidence,
            )

        # Stage 2: Low confidence or borderline — defer to Gemini
        gemini_data = self._gemini_extract(title, content)

        if gemini_data.get("is_inappropriate"):
            return ModerationResult(
                status="rejected" if confidence > 0.7 else "flagged",
                flagged_keywords=gemini_data.get("flagged_keywords", []),
                suggestions=gemini_data.get("suggestions", {}),
                reason="Flagged by Gemini keyword extraction",
                confidence=confidence,
            )

        # Both agree it's clean
        return ModerationResult(
            status="approved",
            flagged_keywords=[],
            suggestions={},
            reason="Clean (verified by both ML and Gemini)",
            confidence=confidence,
        )


moderator = ContentModerator()
