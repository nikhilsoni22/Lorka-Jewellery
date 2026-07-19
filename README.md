# Lorka Jewellers

Production-grade silver-jewellery e-commerce platform. pnpm monorepo built in phases.

## Apps & packages

| Path                      | Description                                  | Port |
| ------------------------- | -------------------------------------------- | ---- |
| `apps/jewellery-api`      | TypeScript Express REST API (clean arch)     | 5000 |
| `apps/jewellery-admin`    | Next.js 15 admin panel                       | 3001 |
| `apps/jewellery-website`  | Next.js 15 customer storefront               | 3000 |
| `packages/types`          | `@lorka/types` — shared enums + Zod schemas  | —    |

## Prerequisites

- Node 20+ (repo uses 22)
- pnpm 11 (`npm i -g pnpm` or via corepack)
- A MongoDB Atlas connection string

## Setup

```bash
pnpm install

# API env
cp apps/jewellery-api/.env.example apps/jewellery-api/.env   # then fill MONGO_URI + secrets

# Seed a super-admin (reads SEED_ADMIN_* from apps/jewellery-api/.env)
pnpm seed:admin
```

## Run

```bash
pnpm dev            # all apps via turbo
pnpm dev:api        # API only        -> http://localhost:5000/api/v1
pnpm dev:admin      # admin only      -> http://localhost:3001
pnpm dev:website    # storefront only -> http://localhost:3000
```

API docs (Swagger): http://localhost:5000/api/v1/docs

## Test

```bash
pnpm --filter jewellery-api test
```

## Roadmap

Phase 1 (current): monorepo setup, authentication, database, admin login.
Phases 2–8: product/category/banner management, storefront, cart/checkout/payments,
orders/tracking/dashboard, reviews/wishlist/coupons/referral, reports/SEO/perf, deployment/CI-CD.
