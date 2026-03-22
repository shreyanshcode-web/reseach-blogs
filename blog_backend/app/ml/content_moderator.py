"""
ML-powered content moderation service.
Combines profanity detection with a TF-IDF + Logistic Regression classifier
to detect and flag inappropriate blog post content.
"""

import os
from dataclasses import dataclass

import joblib
from better_profanity import profanity
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

from app.ml.training_data import TRAINING_DATA

# Path to cache the trained model
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "content_moderator.joblib")

# Thresholds
REJECT_THRESHOLD = 0.85   # High confidence → reject outright
FLAG_THRESHOLD = 0.55     # Medium confidence → flag for review


@dataclass
class ModerationResult:
    """Result of content moderation check."""
    label: str            # "appropriate" or "inappropriate"
    confidence: float     # 0.0 – 1.0
    status: str           # "approved", "flagged", or "rejected"
    reason: str           # Human-readable explanation


class ContentModerator:
    """Content moderation engine combining profanity filter + ML classifier."""

    def __init__(self):
        self.pipeline: Pipeline | None = None
        profanity.load_censor_words()

    # ── Training ─────────────────────────────────────────────────────

    def train_model(self) -> None:
        """Train the TF-IDF + Logistic Regression pipeline on built-in data."""
        texts = [t for t, _ in TRAINING_DATA]
        labels = [l for _, l in TRAINING_DATA]

        self.pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(
                max_features=5000,
                ngram_range=(1, 2),
                stop_words="english",
                min_df=1,
            )),
            ("clf", LogisticRegression(
                max_iter=1000,
                C=1.0,
                class_weight="balanced",
            )),
        ])
        self.pipeline.fit(texts, labels)

        # Cache to disk for faster restarts
        os.makedirs(MODEL_DIR, exist_ok=True)
        joblib.dump(self.pipeline, MODEL_PATH)

    def load_or_train(self) -> None:
        """Load a cached model or train a fresh one."""
        if os.path.exists(MODEL_PATH):
            self.pipeline = joblib.load(MODEL_PATH)
        else:
            self.train_model()

    # ── Prediction ───────────────────────────────────────────────────

    def _ml_predict(self, text: str) -> tuple[str, float]:
        """Run the ML classifier and return (label, confidence)."""
        if self.pipeline is None:
            raise RuntimeError("Model not loaded. Call load_or_train() first.")

        proba = self.pipeline.predict_proba([text])[0]
        # proba[0] = P(appropriate), proba[1] = P(inappropriate)
        inappropriate_prob = float(proba[1])
        label = "inappropriate" if inappropriate_prob >= 0.5 else "appropriate"
        confidence = inappropriate_prob if label == "inappropriate" else (1 - inappropriate_prob)
        return label, confidence

    def _check_profanity(self, text: str) -> bool:
        """Return True if the text contains profanity."""
        return profanity.contains_profanity(text)

    # ── Public API ───────────────────────────────────────────────────

    def moderate(self, title: str, content: str) -> ModerationResult:
        """
        Run full moderation pipeline on a blog post.

        Combines:
        1. Profanity filter (keyword-based, fast)
        2. ML classifier (TF-IDF + LogReg, nuanced)

        Returns a ModerationResult with label, confidence, status, and reason.
        """
        combined_text = f"{title} {content}"

        # Step 1 – profanity check
        has_profanity = self._check_profanity(combined_text)

        # Step 2 – ML prediction
        ml_label, ml_confidence = self._ml_predict(combined_text)

        # Step 3 – Combine signals
        if has_profanity and ml_label == "inappropriate":
            # Both signals agree → high confidence
            confidence = min(ml_confidence + 0.15, 1.0)
            return ModerationResult(
                label="inappropriate",
                confidence=round(confidence, 3),
                status="rejected" if confidence >= REJECT_THRESHOLD else "flagged",
                reason="Content contains profanity and was classified as inappropriate by ML model.",
            )

        if has_profanity:
            # Profanity detected but ML says OK → flag for review
            return ModerationResult(
                label="inappropriate",
                confidence=round(0.65, 3),
                status="flagged",
                reason="Content contains profanity but ML model has low confidence. Flagged for review.",
            )

        if ml_label == "inappropriate":
            # ML detects issues but no keywords → use ML confidence
            status = (
                "rejected" if ml_confidence >= REJECT_THRESHOLD
                else "flagged" if ml_confidence >= FLAG_THRESHOLD
                else "approved"
            )
            return ModerationResult(
                label="inappropriate",
                confidence=round(ml_confidence, 3),
                status=status,
                reason=f"ML model classified content as inappropriate (confidence: {ml_confidence:.1%}).",
            )

        # Both signals say it's clean
        return ModerationResult(
            label="appropriate",
            confidence=round(ml_confidence, 3),
            status="approved",
            reason="Content passed all moderation checks.",
        )

    def check_text(self, text: str) -> ModerationResult:
        """Quick check for arbitrary text (used by the preview endpoint)."""
        return self.moderate(title="", content=text)


# Singleton instance
moderator = ContentModerator()
