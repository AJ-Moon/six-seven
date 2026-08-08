-- Single-tenant deployment: this install serves one restaurant with one admin
-- panel, so the platform ("super admin") tier is removed entirely. The
-- /api/platform-admin router, its frontend pages and the get_platform_admin
-- dependency are deleted; dropping the table removes the last credential store
-- that could authenticate a super admin.

DROP TABLE IF EXISTS platform_admins;
