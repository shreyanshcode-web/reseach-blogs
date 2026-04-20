import json
import logging
from functools import lru_cache
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen

from jose import JWTError, jwt

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


@lru_cache()
def _load_clerk_jwks() -> dict[str, Any]:
    jwks_url = settings.CLERK_JWKS_URL
    if not jwks_url:
        logger.warning("CLERK_JWKS_URL not set")
        return {"keys": []}

    try:
        request = Request(jwks_url, headers={"User-Agent": "blog-backend"})
        with urlopen(request, timeout=10) as response:
            result = json.load(response)
            logger.debug(f"Loaded JWKS with {len(result.get('keys', []))} keys")
            return result
    except URLError as e:
        logger.error(f"Failed to load JWKS from {jwks_url}: {e}")
        return {"keys": []}


def verify_clerk_token(token: str) -> dict[str, Any] | None:
    if not token:
        logger.warning("Empty token provided")
        return None

    jwks = _load_clerk_jwks()
    if not jwks.get("keys"):
        logger.error("No JWKS keys available")
        return None

    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        logger.debug(f"Token kid: {kid}, alg: {header.get('alg')}")
        
        key = next((k for k in jwks["keys"] if k.get("kid") == kid), None)
        if key is None:
            logger.error(f"Key with kid '{kid}' not found in JWKS")
            return None

        decode_kwargs: dict[str, Any] = {"algorithms": [header.get("alg", "RS256")], "options": {"verify_aud": False}}
        if settings.CLERK_ISSUER:
            decode_kwargs["issuer"] = settings.CLERK_ISSUER
            logger.debug(f"Using issuer: {settings.CLERK_ISSUER}")

        result = jwt.decode(token, key, **decode_kwargs)
        logger.debug(f"Token verified successfully for: {result.get('email')}")
        return result
    except JWTError as e:
        logger.error(f"JWT verification failed. Error: {e}, kid: {header.get('kid') if 'header' in locals() else 'N/A'}")
        return None
