import os
from typing import Callable, Optional

from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from db import get_db

bearer_scheme = HTTPBearer(auto_error=False)

_LOCAL_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0", "::1", "testserver"}


class TenantContext(BaseModel):
    id: int
    name: str = ""
    slug: str = ""
    hostname: str = ""
    source: str


class TokenData(BaseModel):
    id: str
    email: str
    restaurant_id: int
    role: str = "customer"
    token_type: str = "customer"


def normalize_hostname(host_header: str) -> str:
    host = (host_header or "").strip().lower()
    if host.startswith("[") and "]" in host:
        return host[1 : host.index("]")]
    return host.split(":", 1)[0].rstrip(".")


def is_local_hostname(hostname: str) -> bool:
    return hostname in _LOCAL_HOSTS or hostname.endswith(".localhost")


def _allow_dev_tenant_header() -> bool:
    configured = os.getenv("ALLOW_DEV_TENANT_HEADER")
    if configured is not None:
        return configured.strip().lower() in {"1", "true", "yes", "on"}
    # Honour both names: deployments set ENVIRONMENT, while this gate was
    # originally written against APP_ENV. Reading only one meant a production
    # deploy still accepted the X-Restaurant-ID override.
    env = (os.getenv("APP_ENV") or os.getenv("ENVIRONMENT") or "development").lower()
    return env != "production"


def _lookup_tenant(*, hostname: Optional[str] = None, tenant_id: Optional[int] = None) -> Optional[TenantContext]:
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                if hostname is not None:
                    cur.execute(
                        """SELECT r.id, r.name, r.slug
                           FROM domains d
                           JOIN restaurants r ON r.id = d.restaurant_id
                           WHERE lower(d.domain) = %s AND d.verified = TRUE
                           LIMIT 1""",
                        (hostname,),
                    )
                    source = "domain"
                else:
                    cur.execute(
                        "SELECT id, name, slug FROM restaurants WHERE id = %s LIMIT 1",
                        (tenant_id,),
                    )
                    source = "development_header"
                row = cur.fetchone()
    except Exception:
        raise HTTPException(status_code=503, detail="Tenant directory is temporarily unavailable")

    if not row:
        return None
    return TenantContext(
        id=int(row[0]),
        name=row[1] or "",
        slug=row[2] or "",
        hostname=hostname or "",
        source=source,
    )


def _single_restaurant_mode() -> bool:
    """This install serves one restaurant (the platform/super-admin tier is gone).

    In that mode the Host header carries no routing information, so an unknown
    hostname should still serve the restaurant rather than 404. Without this a
    deployment answers every public request with "Restaurant not found for this
    domain" until someone hand-inserts the exact hostname into the domains
    table — and it would break again on www vs apex, or on a platform preview
    URL. Set SINGLE_RESTAURANT_MODE=false to restore strict domain matching.
    """
    return os.getenv("SINGLE_RESTAURANT_MODE", "true").strip().lower() in {"1", "true", "yes", "on"}


def resolve_public_tenant(
    request: Request,
    x_restaurant_id: Optional[str] = Header(default=None),
) -> TenantContext:
    """Resolve a public request to the restaurant that should serve it."""
    hostname = normalize_hostname(request.headers.get("host", ""))

    if hostname and not is_local_hostname(hostname):
        tenant = _lookup_tenant(hostname=hostname)
        if tenant:
            return tenant
        if not _single_restaurant_mode():
            raise HTTPException(status_code=404, detail="Restaurant not found for this domain")
        default_id = int(os.getenv("DEFAULT_RESTAURANT_ID", "1"))
        tenant = _lookup_tenant(tenant_id=default_id)
        if not tenant:
            raise HTTPException(status_code=404, detail="Restaurant not found")
        tenant.hostname = hostname
        tenant.source = "single_restaurant_default"
        return tenant

    if x_restaurant_id and _allow_dev_tenant_header():
        try:
            requested_id = int(x_restaurant_id)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="X-Restaurant-ID must be an integer")
        tenant = _lookup_tenant(tenant_id=requested_id)
        if not tenant:
            raise HTTPException(status_code=404, detail="Restaurant not found")
        tenant.hostname = hostname
        return tenant

    default_id = int(os.getenv("DEFAULT_RESTAURANT_ID", "1"))
    tenant = _lookup_tenant(tenant_id=default_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Default development restaurant not found")
    tenant.hostname = hostname
    tenant.source = "development_default"
    return tenant


def get_restaurant_id(tenant: TenantContext = Depends(resolve_public_tenant)) -> int:
    """Compatibility dependency for existing tenant-scoped public routes."""
    return tenant.id


def _decode_token(credentials: Optional[HTTPAuthorizationCredentials]) -> dict:
    secret = os.getenv("JWT_SECRET")
    if not secret:
        raise HTTPException(status_code=500, detail="JWT_SECRET not configured")
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return jwt.decode(credentials.credentials, secret, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def _enforce_token_tenant(payload: dict, tenant: TenantContext) -> int:
    try:
        token_tenant_id = int(payload["restaurant_id"])
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Token is missing a valid tenant claim")

    # Local default mode supports existing authenticated clients that do not send
    # the development tenant header. Explicit domains and headers must match.
    if tenant.source != "development_default" and token_tenant_id != tenant.id:
        raise HTTPException(status_code=403, detail="Token is not valid for this tenant")
    return token_tenant_id


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    tenant: TenantContext = Depends(resolve_public_tenant),
) -> TokenData:
    payload = _decode_token(credentials)
    token_type = payload.get("type", "customer")
    if token_type in {"admin", "platform_admin"}:
        raise HTTPException(status_code=403, detail="Customer credentials required")
    tenant_id = _enforce_token_tenant(payload, tenant)
    try:
        return TokenData(
            id=str(payload["id"]),
            email=str(payload["email"]),
            restaurant_id=tenant_id,
            role=str(payload.get("role", "customer")),
            token_type=str(token_type),
        )
    except KeyError:
        raise HTTPException(status_code=401, detail="Token is missing required claims")


def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    tenant: TenantContext = Depends(resolve_public_tenant),
) -> Optional[TokenData]:
    if not credentials:
        return None
    return get_current_user(credentials=credentials, tenant=tenant)


def get_current_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    tenant: TenantContext = Depends(resolve_public_tenant),
) -> dict:
    payload = _decode_token(credentials)
    if payload.get("type") != "admin":
        raise HTTPException(status_code=403, detail="Admin credentials required")
    _enforce_token_tenant(payload, tenant)
    return payload


def require_tenant_role(*allowed_roles: str) -> Callable:
    normalized = {role.lower() for role in allowed_roles}

    def dependency(admin: dict = Depends(get_current_admin)) -> dict:
        role = str(admin.get("role", "")).lower()
        if role not in normalized:
            raise HTTPException(status_code=403, detail="Insufficient tenant role")
        return admin

    return dependency


