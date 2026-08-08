import hashlib
import os
from typing import Optional

from fastapi import HTTPException, Request

from db import get_db


def consume_intervention_rate(tenant_id: int, scope: str, env_key: str, default_limit: int) -> int:
    limit = max(1, int(os.getenv(env_key, str(default_limit))))
    with get_db() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """INSERT INTO intervention_request_windows (tenant_id,scope,window_start,request_count)
                   VALUES (%s,%s,date_trunc('minute',NOW()),1)
                   ON CONFLICT (tenant_id,scope,window_start) DO UPDATE SET
                     request_count=intervention_request_windows.request_count+1,updated_at=NOW()
                   RETURNING request_count""",
                (tenant_id, scope),
            )
            count = int(cursor.fetchone()[0])
    if count > limit:
        raise HTTPException(status_code=429, detail=f"{scope} rate limit exceeded")
    return count


def _client_ip(request: Optional[Request]) -> str:
    """Best-effort client address. Trusts X-Forwarded-For's first hop, which is
    what the reverse proxy sets; falls back to the socket peer."""
    if request is None:
        return "unknown"
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()[:64]
    return (request.client.host if request.client else "unknown")[:64]


def consume_login_attempt(
    tenant_id: int,
    email: str,
    request: Optional[Request],
    env_key: str = "LOGIN_RATE_LIMIT_PER_MINUTE",
    default_limit: int = 10,
) -> None:
    """Throttle credential checks so a password cannot be brute-forced.

    Two independent windows: one per source address (stops a single host from
    spraying many accounts) and one per account (stops a distributed guess
    against one high-value login, e.g. the admin). The scope column is
    varchar(60), so both keys are hashed to a fixed width.
    """
    ip_key = hashlib.sha256(_client_ip(request).encode()).hexdigest()[:24]
    email_key = hashlib.sha256(email.strip().lower().encode()).hexdigest()[:24]
    consume_intervention_rate(tenant_id, f"login-ip:{ip_key}", env_key, default_limit)
    consume_intervention_rate(tenant_id, f"login-acct:{email_key}", env_key, default_limit)
