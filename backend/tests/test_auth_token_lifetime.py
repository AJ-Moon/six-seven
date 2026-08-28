import os
import unittest
from unittest.mock import patch

from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt

from dependencies.auth import TenantContext, get_current_admin, get_current_user
from routers.admin import _sign_admin_token
from routers.auth import _sign_token


class AuthTokenLifetimeTests(unittest.TestCase):
    def test_customer_tokens_do_not_expire_automatically(self):
        secret = "test-secret-that-is-long-enough"
        with patch.dict(os.environ, {"JWT_SECRET": secret}):
            token = _sign_token("user-1", "u@example.com", 1)
            claims = jwt.decode(token, secret, algorithms=["HS256"])

        self.assertNotIn("exp", claims)

        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        tenant = TenantContext(id=1, source="domain", hostname="sixseven.pk")
        with patch.dict(os.environ, {"JWT_SECRET": secret}):
            user = get_current_user(credentials=credentials, tenant=tenant)
        self.assertEqual(user.id, "user-1")

    def test_admin_tokens_do_not_expire_automatically(self):
        secret = "test-secret-that-is-long-enough"
        with patch.dict(os.environ, {"JWT_SECRET": secret}):
            token = _sign_admin_token("admin-1", "admin@example.com", "admin", 1)
            claims = jwt.decode(token, secret, algorithms=["HS256"])

        self.assertNotIn("exp", claims)

        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        tenant = TenantContext(id=1, source="domain", hostname="sixseven.pk")
        with patch.dict(os.environ, {"JWT_SECRET": secret}):
            admin = get_current_admin(credentials=credentials, tenant=tenant)
        self.assertEqual(admin["id"], "admin-1")


if __name__ == "__main__":
    unittest.main()
