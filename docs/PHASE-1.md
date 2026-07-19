# Phase 1 — Setup, Authentication, Database, Admin Login

Status: **complete and verified**.

## 1. Architecture

pnpm monorepo, three deployable apps + one shared package. Clean architecture in the API:
routes → controllers (HTTP) → services (domain logic) → repositories (persistence), with all
services depending on **interfaces** (DIP). Wiring happens in a single **composition root**
(`src/container/container.ts`) using plain constructor injection — no decorators/reflection, so
it runs identically under `tsx`, `tsup`, and Vitest.

```
packages/types (@lorka/types)   shared enums + Zod schemas + DTOs (one source of truth)
apps/jewellery-api              Express + Mongoose, layered by module (auth/users/tokens/audit)
apps/jewellery-admin            Next.js 15 — login + protected dashboard shell
apps/jewellery-website          Next.js 15 — storefront scaffold (real pages in Phase 3)
```

Security: JWT access tokens (in-memory on the client) + **rotating** refresh tokens stored
**hashed** in Mongo and delivered as an `httpOnly` cookie; RBAC guards; helmet; CORS with
credentials; per-route rate limiting; Zod validation on every input; mongo-sanitize; centralized
error handling; structured pino logs; admin-login audit trail.

## 2. API endpoints (`/api/v1`)

| Method | Path | Auth | Notes |
| ------ | ---- | ---- | ----- |
| GET  | `/health` | public | DB status |
| POST | `/auth/register` | public | Customer signup |
| POST | `/auth/login` | public | Customer login |
| POST | `/auth/admin/login` | public | Admin login (403 for non-admins) |
| POST | `/auth/refresh` | cookie | Rotate refresh → new access token |
| POST | `/auth/logout` | cookie | Revoke refresh token |
| POST | `/auth/forgot-password` | public | Issue reset token (dev: logged) |
| POST | `/auth/reset-password` | public | Reset via token, revokes sessions |
| GET  | `/auth/me` | Bearer | Current user |
| POST | `/auth/google` · `/auth/otp/request` · `/auth/otp/verify` | public | **501** until credentials provided |
| GET  | `/docs` | public | Swagger UI |

## 3. MongoDB schemas (collections created this phase)

- **users** — `name, email(unique), passwordHash, role(customer|admin|super_admin), isBlocked,
  emailVerified, resetTokenHash?, resetTokenExpires?, timestamps`.
- **refreshtokens** — `userId, tokenHash(unique), expiresAt(TTL index), revokedAt?,
  replacedByTokenHash?, userAgent?, ip?, createdAt`.
- **auditlogs** — `actorId?, action, ip?, userAgent?, meta?, createdAt`.

> Design note: the spec listed separate `users` and `admins` collections; Phase 1 uses a single
> role-based `users` collection for uniform RBAC. Admins are `users` with an admin role.

## 4. Frontend (admin)

- Access token kept **in memory** (not localStorage); session continuity via the refresh cookie
  (`bootstrapSession` on load). Axios interceptor performs a **single-flight refresh on 401**.
- `/login` uses the shared Zod `adminLoginSchema` via react-hook-form; toasts on success/error.
- `/dashboard` is guarded client-side; unauthenticated users are redirected to `/login`.
- Luxury silver theme tokens (white/black/silver, serif display) shared by both front-ends.

## 5. How to run

```bash
pnpm install
cp apps/jewellery-api/.env.example apps/jewellery-api/.env   # already filled with the Atlas URI
pnpm seed:admin        # creates the super-admin from SEED_ADMIN_* in the API .env
pnpm dev               # api :5000, admin :3001, website :3000  (or dev:api / dev:admin / dev:website)
```

Seeded super-admin: **admin@lorka.com / Admin@12345** (change via `SEED_ADMIN_*`).

## 6. Testing

```bash
pnpm --filter jewellery-api test        # 17 tests: 10 unit (fakes) + 7 integration (in-memory Mongo)
pnpm --filter jewellery-api typecheck
pnpm --filter jewellery-admin build     # full Next production build
```

Verified live against Atlas: health, admin login (200), wrong password (401), non-admin (403),
cookie refresh rotation (200), `/auth/me` (200), provider stubs (501), and CORS preflight +
credentialed cookie for the admin origin.
