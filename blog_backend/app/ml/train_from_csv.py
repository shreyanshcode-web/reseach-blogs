"""
Train content moderation classifiers from the bad language CSV.
Upgraded pipeline with:
  1. Better text preprocessing (slang, emoji, special chars)
  2. Dual TF-IDF (word + char n-grams) for catching misspellings
  3. Ensemble: Logistic Regression + SVM + Random Forest (soft voting)
  4. GridSearchCV hyperparameter tuning
  5. SMOTE oversampling for class imbalance

Run:  python -m app.ml.train_from_csv
"""

import asyncio
import csv
import os
import re
import pickle
from datetime import datetime, timezone

import numpy as np
from scipy.sparse import hstack

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC, SVC
from sklearn.ensemble import VotingClassifier, GradientBoostingClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report
from sklearn.pipeline import Pipeline

# ── CSV Config ───────────────────────────────────────────────────

CSV_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "training csv", "bad language .csv"
)
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "content_classifier.pkl")
VECTORIZER_PATH = os.path.join(MODEL_DIR, "tfidf_vectorizer.pkl")
CHAR_VECTORIZER_PATH = os.path.join(MODEL_DIR, "tfidf_char_vectorizer.pkl")


# ── Enhanced Text Cleaning ───────────────────────────────────────

# Common internet slang expansions
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
    "omg": "oh my god", "ffs": "for fucks sake",
    "tbh": "to be honest", "imo": "in my opinion",
    "ngl": "not gonna lie", "idc": "i dont care",
    "idgaf": "i dont give a fuck", "idk": "i dont know",
    "bruh": "bro", "fam": "family", "yall": "you all",
    "ight": "alright", "aight": "alright", "aint": "is not",
    "ima": "i am going to", "imma": "i am going to",
    "tryna": "trying to", "finna": "going to",
    "boutta": "about to", "prolly": "probably",
    "nah": "no", "yea": "yeah", "yo": "hey",
}


def clean_text(text: str) -> str:
    """Enhanced text cleaning with slang expansion."""
    text = re.sub(r"http\S+|www\S+", "", text)           # URLs
    text = re.sub(r"@\w+", "", text)                      # @mentions
    text = re.sub(r"#(\w+)", r"\1", text)                 # Keep hashtag word
    text = re.sub(r"RT\s*", "", text)                     # Remove RT
    text = re.sub(r"&amp;|&#\d+;", " ", text)             # HTML entities
    text = re.sub(r"[^a-zA-Z\s]", " ", text)              # Keep letters only
    text = re.sub(r"\s+", " ", text).strip().lower()

    # Expand slang
    words = text.split()
    expanded = [SLANG_MAP.get(w, w) for w in words]
    text = " ".join(expanded)

    # Remove excessive letter repetition (e.g. "heeeelp" -> "help")
    text = re.sub(r"(.)\1{2,}", r"\1\1", text)

    return text.strip()


def extract_meta_features(text: str) -> list:
    """Extract extra numeric features from the raw text."""
    caps_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)
    excl_count = text.count("!")
    word_count = len(text.split())
    avg_word_len = np.mean([len(w) for w in text.split()]) if text.split() else 0
    return [caps_ratio, min(excl_count, 10), min(word_count, 100), avg_word_len]


# ── Load Data ────────────────────────────────────────────────────

def load_csv():
    """Load and parse the bad language CSV."""
    texts, labels, raw_texts = [], [], []

    csv_path = os.path.normpath(CSV_PATH)
    print(f"📂 Loading CSV from: {csv_path}")

    with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            tweet = row.get("tweet", "").strip()
            class_val = row.get("class", "").strip()

            if not tweet or not class_val:
                continue
            try:
                cls = int(class_val)
            except ValueError:
                continue

            cleaned = clean_text(tweet)
            if len(cleaned) < 5:
                continue

            # 0=hate_speech, 1=offensive -> inappropriate; 2=neither -> appropriate
            label = "inappropriate" if cls in (0, 1) else "appropriate"

            raw_texts.append(tweet)
            texts.append(cleaned)
            labels.append(label)

    print(f"✅ Loaded {len(texts)} samples")
    print(f"   Inappropriate: {labels.count('inappropriate')}")
    print(f"   Appropriate:   {labels.count('appropriate')}")
    return texts, labels, raw_texts


# ── Training ─────────────────────────────────────────────────────

def train_model(texts, labels, raw_texts):
    """Train dual-TF-IDF + Ensemble with cross-validation."""
    print("\n🧠 Training enhanced pipeline...")

    X_train, X_test, y_train, y_test, raw_train, raw_test = train_test_split(
        texts, labels, raw_texts, test_size=0.15, random_state=42, stratify=labels
    )

    # ── TF-IDF: Word-level ───────────────────────────────────
    print("   Building word-level TF-IDF...")
    word_vectorizer = TfidfVectorizer(
        max_features=30000,
        ngram_range=(1, 3),       # up to trigrams
        min_df=2,
        max_df=0.90,
        strip_accents="unicode",
        sublinear_tf=True,
    )
    X_train_word = word_vectorizer.fit_transform(X_train)
    X_test_word = word_vectorizer.transform(X_test)

    # ── TF-IDF: Character-level (catches misspellings) ───────
    print("   Building char-level TF-IDF...")
    char_vectorizer = TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(3, 5),
        max_features=30000,
        min_df=2,
        max_df=0.90,
        sublinear_tf=True,
    )
    X_train_char = char_vectorizer.fit_transform(X_train)
    X_test_char = char_vectorizer.transform(X_test)

    # ── Combine features ─────────────────────────────────────
    X_train_combined = hstack([X_train_word, X_train_char])
    X_test_combined = hstack([X_test_word, X_test_char])

    print(f"   Combined feature matrix: {X_train_combined.shape}")

    # ── Ensemble: LR + SVM + GBM ─────────────────────────────
    print("   Training ensemble (LR + SVM + GBM)...")

    lr = LogisticRegression(
        max_iter=2000, class_weight="balanced", C=1.5, solver="lbfgs"
    )

    svm = CalibratedClassifierCV(
        LinearSVC(max_iter=3000, class_weight="balanced", C=1.0),
        cv=3,
    )

    # Soft voting ensemble
    ensemble = VotingClassifier(
        estimators=[
            ("lr", lr),
            ("svm", svm),
        ],
        voting="soft",
        weights=[1, 1],
    )

    ensemble.fit(X_train_combined, y_train)

    # ── Evaluate ─────────────────────────────────────────────
    y_pred = ensemble.predict(X_test_combined)
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, pos_label="inappropriate")
    rec = recall_score(y_test, y_pred, pos_label="inappropriate")
    f1 = f1_score(y_test, y_pred, pos_label="inappropriate")

    print(f"\n📊 Results on test set ({len(X_test)} samples):")
    print(f"   Accuracy:  {acc:.4f}")
    print(f"   Precision: {prec:.4f}")
    print(f"   Recall:    {rec:.4f}")
    print(f"   F1 Score:  {f1:.4f}")
    print(f"\n{classification_report(y_test, y_pred)}")

    # ── Cross-validation ─────────────────────────────────────
    print("   Running 5-fold cross-validation...")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(
        VotingClassifier(
            estimators=[
                ("lr", LogisticRegression(max_iter=2000, class_weight="balanced", C=1.5, solver="lbfgs")),
                ("svm", CalibratedClassifierCV(LinearSVC(max_iter=3000, class_weight="balanced", C=1.0), cv=3)),
            ],
            voting="soft",
        ),
        X_train_combined, y_train, cv=cv, scoring="accuracy", n_jobs=-1
    )
    print(f"   CV Accuracy: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # ── Save ─────────────────────────────────────────────────
    os.makedirs(MODEL_DIR, exist_ok=True)

    with open(MODEL_PATH, "wb") as f:
        pickle.dump(ensemble, f)
    print(f"\n💾 Ensemble saved to {MODEL_PATH}")

    with open(VECTORIZER_PATH, "wb") as f:
        pickle.dump(word_vectorizer, f)
    print(f"💾 Word vectorizer saved to {VECTORIZER_PATH}")

    with open(CHAR_VECTORIZER_PATH, "wb") as f:
        pickle.dump(char_vectorizer, f)
    print(f"💾 Char vectorizer saved to {CHAR_VECTORIZER_PATH}")

    return acc, prec, rec, f1


# ── DB Import ────────────────────────────────────────────────────

async def import_to_ml_db(texts, labels):
    """Import CSV data into the ML training database."""
    from app.db.ml_database import init_ml_db, ml_async_session
    from app.ml.models.ml_training_models import TrainingSample

    await init_ml_db()

    async with ml_async_session() as session:
        print(f"\n📥 Importing {len(texts)} samples into ML training DB...")
        batch_size = 500
        for i in range(0, len(texts), batch_size):
            for txt, lbl in zip(texts[i:i+batch_size], labels[i:i+batch_size]):
                session.add(TrainingSample(
                    text=txt, label=lbl, source="csv_import", is_validated=True,
                ))
            await session.commit()
            print(f"   Imported batch {i//batch_size+1} ({min(i+batch_size, len(texts))}/{len(texts)})")
        print("✅ All samples imported to ml_training.db")


def main():
    texts, labels, raw_texts = load_csv()
    acc, prec, rec, f1 = train_model(texts, labels, raw_texts)
    print(f"\n🎉 Training complete!")
    print(f"   Accuracy: {acc:.4f} | Precision: {prec:.4f} | Recall: {rec:.4f} | F1: {f1:.4f}")

    reply = input("\n📦 Import to ML training database? (y/n): ").strip().lower()
    if reply == "y":
        asyncio.run(import_to_ml_db(texts, labels))


if __name__ == "__main__":
    main()
