import logging
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clerk import verify_clerk_token
from app.core.security import decode_access_token
from app.db.database import get_db
from app.models.user import User
from app.repositories.user_repository import user_repository
from app.services.user_service import user_service

logger = logging.getLogger(__name__)

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
    logger.info(f"Attempting to verify Clerk token, first 20 chars: {token[:20] if token else 'EMPTY'}")
    claims = verify_clerk_token(token)
    if not claims:
        logger.warning("Clerk token verification failed - no claims returned")
        return None

    # Try to get email, but Clerk default tokens only have 'sub'
    email = (claims.get("email") or "").strip().lower()
    clerk_id = claims.get("sub")
    
    if not email and not clerk_id:
        logger.warning(f"No email or sub in claims: {list(claims.keys())}")
        return None

    logger.info(f"Token verified for clerk_id: {clerk_id}, email: {email}")
    
    # Try finding by email if available
    if email:
        user = await user_repository.get_by_email(db, email)
        if user:
            logger.info(f"Found existing user for email: {email}")
            return user

    # Fallback to creating/getting user based on claims (will use sub if email missing)
    logger.info(f"Getting or creating Clerk user for identifier: {email or clerk_id}")
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
