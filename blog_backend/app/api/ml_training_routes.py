"""
API routes for managing the ML training database.
Admin-only endpoints for CRUD on training samples, keywords, and model versions.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.ml_database import get_ml_db
from app.middleware.auth_middleware import get_admin_user
from app.ml.models.ml_training_models import ModelVersion, TrainingKeyword, TrainingSample
from app.models.user import User

router = APIRouter(prefix="/api/ml", tags=["ML Training"])


# ── Schemas ──────────────────────────────────────────────────────

class TrainingSampleCreate(BaseModel):
    text: str = Field(..., min_length=1)
    label: str = Field(..., description="appropriate or inappropriate")
    source: str = Field("manual", description="manual, moderation_feedback, bulk_import, auto_labeled")
    confidence: Optional[float] = None


class TrainingSampleResponse(BaseModel):
    id: int
    text: str
    label: str
    source: str
    confidence: float | None
    is_validated: bool
    created_at: str

    model_config = {"from_attributes": True}


class BulkImportRequest(BaseModel):
    samples: List[TrainingSampleCreate]


class TrainingKeywordCreate(BaseModel):
    keyword: str = Field(..., min_length=1, max_length=200)
    category: str = Field(..., description="explicit, violence, misinformation, spam, hate_speech")
    severity: str = Field("medium", description="low, medium, high, critical")
    suggestion: Optional[str] = None


class TrainingKeywordResponse(BaseModel):
    id: int
    keyword: str
    category: str
    severity: str
    suggestion: str | None
    is_active: bool

    model_config = {"from_attributes": True}


class ModelVersionResponse(BaseModel):
    id: int
    version: str
    accuracy: float | None
    precision_score: float | None
    recall_score: float | None
    f1_score: float | None
    sample_count: int
    is_active: bool
    notes: str | None
    trained_at: str

    model_config = {"from_attributes": True}


class MLDashboardStats(BaseModel):
    total_samples: int
    appropriate_samples: int
    inappropriate_samples: int
    validated_samples: int
    unvalidated_samples: int
    total_keywords: int
    active_keywords: int
    model_versions: int
    active_model: str | None


# ── Dashboard ────────────────────────────────────────────────────

@router.get("/stats", response_model=MLDashboardStats)
async def get_ml_stats(
    ml_db: AsyncSession = Depends(get_ml_db),
    _admin: User = Depends(get_admin_user),
):
    """Get ML training database statistics."""
    total = (await ml_db.execute(select(func.count(TrainingSample.id)))).scalar() or 0
    appropriate = (await ml_db.execute(
        select(func.count(TrainingSample.id)).where(TrainingSample.label == "appropriate")
    )).scalar() or 0
    inappropriate = (await ml_db.execute(
        select(func.count(TrainingSample.id)).where(TrainingSample.label == "inappropriate")
    )).scalar() or 0
    validated = (await ml_db.execute(
        select(func.count(TrainingSample.id)).where(TrainingSample.is_validated == True)
    )).scalar() or 0
    total_kw = (await ml_db.execute(select(func.count(TrainingKeyword.id)))).scalar() or 0
    active_kw = (await ml_db.execute(
        select(func.count(TrainingKeyword.id)).where(TrainingKeyword.is_active == True)
    )).scalar() or 0
    model_count = (await ml_db.execute(select(func.count(ModelVersion.id)))).scalar() or 0

    active_model_result = await ml_db.execute(
        select(ModelVersion.version).where(ModelVersion.is_active == True)
    )
    active_model = active_model_result.scalar_one_or_none()

    return MLDashboardStats(
        total_samples=total,
        appropriate_samples=appropriate,
        inappropriate_samples=inappropriate,
        validated_samples=validated,
        unvalidated_samples=total - validated,
        total_keywords=total_kw,
        active_keywords=active_kw,
        model_versions=model_count,
        active_model=active_model,
    )


# ── Training Samples CRUD ───────────────────────────────────────

@router.get("/samples", response_model=List[TrainingSampleResponse])
async def list_samples(
    skip: int = 0,
    limit: int = 100,
    label: Optional[str] = None,
    validated: Optional[bool] = None,
    ml_db: AsyncSession = Depends(get_ml_db),
    _admin: User = Depends(get_admin_user),
):
    """List training samples with optional filters."""
    query = select(TrainingSample)
    if label:
        query = query.where(TrainingSample.label == label)
    if validated is not None:
        query = query.where(TrainingSample.is_validated == validated)
    query = query.offset(skip).limit(limit).order_by(TrainingSample.created_at.desc())
    result = await ml_db.execute(query)
    samples = result.scalars().all()
    return [
        TrainingSampleResponse(
            id=s.id, text=s.text, label=s.label, source=s.source,
            confidence=s.confidence, is_validated=s.is_validated,
            created_at=s.created_at.isoformat(),
        )
        for s in samples
    ]


@router.post("/samples", response_model=TrainingSampleResponse, status_code=201)
async def add_sample(
    data: TrainingSampleCreate,
    ml_db: AsyncSession = Depends(get_ml_db),
    _admin: User = Depends(get_admin_user),
):
    """Add a single training sample."""
    if data.label not in ("appropriate", "inappropriate"):
        raise HTTPException(status_code=400, detail="Label must be 'appropriate' or 'inappropriate'")
    sample = TrainingSample(
        text=data.text, label=data.label, source=data.source, confidence=data.confidence,
    )
    ml_db.add(sample)
    await ml_db.commit()
    await ml_db.refresh(sample)
    return TrainingSampleResponse(
        id=sample.id, text=sample.text, label=sample.label, source=sample.source,
        confidence=sample.confidence, is_validated=sample.is_validated,
        created_at=sample.created_at.isoformat(),
    )


@router.post("/samples/bulk", status_code=201)
async def bulk_import_samples(
    data: BulkImportRequest,
    ml_db: AsyncSession = Depends(get_ml_db),
    _admin: User = Depends(get_admin_user),
):
    """Bulk import training samples."""
    count = 0
    for s in data.samples:
        if s.label not in ("appropriate", "inappropriate"):
            continue
        sample = TrainingSample(
            text=s.text, label=s.label, source=s.source or "bulk_import",
            confidence=s.confidence,
        )
        ml_db.add(sample)
        count += 1

    await ml_db.commit()
    return {"detail": f"Imported {count} training samples"}


@router.put("/samples/{sample_id}/validate")
async def validate_sample(
    sample_id: int,
    ml_db: AsyncSession = Depends(get_ml_db),
    _admin: User = Depends(get_admin_user),
):
    """Mark a training sample as validated (human-reviewed)."""
    sample = await ml_db.get(TrainingSample, sample_id)
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    sample.is_validated = True
    await ml_db.commit()
    return {"detail": f"Sample {sample_id} validated"}


@router.put("/samples/{sample_id}/relabel")
async def relabel_sample(
    sample_id: int,
    new_label: str,
    ml_db: AsyncSession = Depends(get_ml_db),
    _admin: User = Depends(get_admin_user),
):
    """Change the label of a training sample."""
    if new_label not in ("appropriate", "inappropriate"):
        raise HTTPException(status_code=400, detail="Label must be 'appropriate' or 'inappropriate'")
    sample = await ml_db.get(TrainingSample, sample_id)
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    sample.label = new_label
    sample.is_validated = True
    await ml_db.commit()
    return {"detail": f"Sample {sample_id} relabeled to '{new_label}'"}


@router.delete("/samples/{sample_id}", status_code=204)
async def delete_sample(
    sample_id: int,
    ml_db: AsyncSession = Depends(get_ml_db),
    _admin: User = Depends(get_admin_user),
):
    """Delete a training sample."""
    sample = await ml_db.get(TrainingSample, sample_id)
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    await ml_db.delete(sample)
    await ml_db.commit()


# ── Keywords CRUD ────────────────────────────────────────────────

@router.get("/keywords", response_model=List[TrainingKeywordResponse])
async def list_keywords(
    category: Optional[str] = None,
    ml_db: AsyncSession = Depends(get_ml_db),
    _admin: User = Depends(get_admin_user),
):
    """List all training keywords."""
    query = select(TrainingKeyword)
    if category:
        query = query.where(TrainingKeyword.category == category)
    result = await ml_db.execute(query.order_by(TrainingKeyword.category, TrainingKeyword.keyword))
    return result.scalars().all()


@router.post("/keywords", response_model=TrainingKeywordResponse, status_code=201)
async def add_keyword(
    data: TrainingKeywordCreate,
    ml_db: AsyncSession = Depends(get_ml_db),
    _admin: User = Depends(get_admin_user),
):
    """Add a new keyword to the filter."""
    existing = await ml_db.execute(
        select(TrainingKeyword).where(TrainingKeyword.keyword == data.keyword)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Keyword already exists")

    kw = TrainingKeyword(
        keyword=data.keyword, category=data.category,
        severity=data.severity, suggestion=data.suggestion,
    )
    ml_db.add(kw)
    await ml_db.commit()
    await ml_db.refresh(kw)
    return kw


@router.delete("/keywords/{keyword_id}", status_code=204)
async def delete_keyword(
    keyword_id: int,
    ml_db: AsyncSession = Depends(get_ml_db),
    _admin: User = Depends(get_admin_user),
):
    """Delete a keyword."""
    kw = await ml_db.get(TrainingKeyword, keyword_id)
    if not kw:
        raise HTTPException(status_code=404, detail="Keyword not found")
    await ml_db.delete(kw)
    await ml_db.commit()


# ── Model Versions ───────────────────────────────────────────────

@router.get("/models", response_model=List[ModelVersionResponse])
async def list_model_versions(
    ml_db: AsyncSession = Depends(get_ml_db),
    _admin: User = Depends(get_admin_user),
):
    """List all trained model versions."""
    result = await ml_db.execute(
        select(ModelVersion).order_by(ModelVersion.trained_at.desc())
    )
    versions = result.scalars().all()
    return [
        ModelVersionResponse(
            id=v.id, version=v.version, accuracy=v.accuracy,
            precision_score=v.precision_score, recall_score=v.recall_score,
            f1_score=v.f1_score, sample_count=v.sample_count,
            is_active=v.is_active, notes=v.notes,
            trained_at=v.trained_at.isoformat(),
        )
        for v in versions
    ]
