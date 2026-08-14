# 0001 — Roles as text column on user table, not separate entities

The auth schema stores roles as a plain `text` column on the `user` table rather than using dedicated `role`, `permission`, and join tables with M:N relationships.

We chose this because better-auth's default adapter pattern uses a flat role field, and the Recruiter app's RBAC model (7 fixed roles: admin, bd, caller, qc, rm, sc, tl) doesn't require dynamic role creation or per-role permission assignment at runtime. Permissions are declared statically via `createAccessControl` at the application level, not stored in the database.

This means: no `AuthRole` table, no `AuthPermission` table, no `UserRole` join table, no `RolePermission` join table. The entire M:N RBAC model described in earlier docs was aspirational — the code has always used the flat approach.
