from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clerk import verify_clerk_token
from app.core.security import decode_access_token
from app.db.database import get_db
from app.models.user import User
from app.repositories.user_repository import user_repository
from app.services.user_service import user_service

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/users/login")
oauth2_scheme_optional = OAuth2PasswordBearer(
    tokenUrl="/api/users/login",
    auto_error=False,
)


async def _get_user_from_local_token(token: str, db: AsyncSession) -> User | None:
    payload = decode_access_token(token)
    if payload is None:
        return None

    user_id_str: str | None = payload.get("sub")
    if user_id_str is None:
        return None

    try:
        user_id = int(user_id_str)
    except ValueError:
        return None

    return await user_repository.get_by_id(db, user_id)


async def _get_user_from_clerk_token(token: str, db: AsyncSession) -> User | None:
    claims = verify_clerk_token(token)
    if not claims:
        return None

    email = (claims.get("email") or "").strip().lower()
    if not email:
        return None

    user = await user_repository.get_by_email(db, email)
    if user:
        return user

    return await user_service.get_or_create_clerk_user(db, claims)


async def _get_authenticated_user(token: str, db: AsyncSession) -> User | None:
    user = await _get_user_from_local_token(token, db)
    if user is not None:
        return user

    return await _get_user_from_clerk_token(token, db)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    user = await _get_authenticated_user(token, db)
    if user is None:
        raise credentials_exception

    if user.is_suspended:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account suspended: {user.suspended_reason or 'Contact admin'}",
        )

    return user


async def get_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency that ensures the current user has admin privileges."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user


async def get_current_user_optional(
    token: str | None = Depends(oauth2_scheme_optional),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if not token:
        return None

    return await _get_authenticated_user(token, db)
