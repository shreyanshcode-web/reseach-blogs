import json
from functools import lru_cache
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen

from jose import JWTError, jwt

from app.core.config import get_settings

settings = get_settings()


@lru_cache()
def _load_clerk_jwks() -> dict[str, Any]:
    jwks_url = settings.CLERK_JWKS_URL
    if not jwks_url:
        return {"keys": []}

    try:
        request = Request(jwks_url, headers={"User-Agent": "blog-backend"})
        with urlopen(request, timeout=10) as response:
            return json.load(response)
    except URLError:
        return {"keys": []}


def verify_clerk_token(token: str) -> dict[str, Any] | None:
    jwks = _load_clerk_jwks()
    if not jwks.get("keys"):
        return None

    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        key = next((k for k in jwks["keys"] if k.get("kid") == kid), None)
        if key is None:
            return None

        decode_kwargs: dict[str, Any] = {"algorithms": [header.get("alg", "RS256")], "options": {"verify_aud": False}}
        if settings.CLERK_ISSUER:
            decode_kwargs["issuer"] = settings.CLERK_ISSUER

        return jwt.decode(token, key, **decode_kwargs)
    except JWTError:
        return None
