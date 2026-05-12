# YWBC Backend

REST API for **Your Wellbeing Center** — a Rwandan mental-health initiative founded by Dr. Brave Olivier. The mobile app (Expo + React Native, in `../yourwellbeing_app`) and its admin section both consume this API.

Built with **Hono + Prisma + PostgreSQL + TypeScript** (strict).

## Setup

```bash
# 1. Install
npm install

# 2. Create .env from the template and fill in values
cp .env.example .env
#  At minimum, set DATABASE_URL and a 32+ char JWT_SECRET.

# 3. Apply schema
npx prisma migrate dev --name init
npx prisma generate

# 4. Seed initial data
npm run db:seed

# 5. Run
npm run dev
```

The server listens on `PORT` (default `4000`).

> **First admin login**: email `brave@yourwellbeingcenter.rw`, password `ChangeMe123!` — change it immediately on first sign-in.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the server with `tsx watch` |
| `npm run db:migrate` | Apply / create Prisma migrations |
| `npm run db:seed` | Seed admin user, sample therapists, FAQs, quotes, etc. |
| `npm run db:studio` | Open Prisma Studio in your browser |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run the vitest suite |

## Project Layout

```
src/
├── app.ts                   # Hono app + middleware chain
├── index.ts                 # bootstrap
├── env.ts                   # zod-validated env loader
├── lib/                     # prisma, jwt, password, logger, cloudinary, apiError
├── middleware/              # auth, admin, validate, error, rateLimit
├── routes/                  # public + auth + admin routes
├── services/                # business logic (one file per domain)
├── validators/              # zod schemas
├── utils/                   # pagination, response helpers, slugify
├── types/                   # hono context, shared API types
└── generated/prisma/        # Prisma v7 generated client
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
tests/                       # vitest suites
```

## Endpoint catalog

**Public**

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/sign-up` | rate-limited |
| POST | `/api/auth/sign-in` | rate-limited |
| POST | `/api/auth/forgot-password` | rate-limited |
| POST | `/api/auth/reset-password` | with email token |
| GET  | `/api/psychologists` | active only |
| GET  | `/api/psychologists/:id` ||
| GET  | `/api/psychologists/:id/slots?date=YYYY-MM-DD` ||
| GET  | `/api/articles` | published only, paginated |
| GET  | `/api/articles/:slug` ||
| GET  | `/api/quotes` ||
| GET  | `/api/quotes/daily` | rotates by day-of-year |
| GET  | `/api/faqs` ||
| GET  | `/api/faqs/:id` ||
| GET  | `/api/meditations` ||
| GET  | `/api/meditations/:id` ||
| GET  | `/api/nutrition/tips` ||
| GET  | `/api/nutrition/tips/daily` ||
| GET  | `/api/nutrition/meal-plans` ||
| GET  | `/api/nutrition/meal-plans/:id` ||
| GET  | `/api/sessions?status=upcoming|past` ||
| GET  | `/api/sessions/:id` ||

**Authenticated user**

| Method | Path |
|---|---|
| GET    | `/api/auth/me` |
| POST   | `/api/auth/sign-out` |
| PATCH  | `/api/users/me` |
| POST   | `/api/bookings` |
| GET    | `/api/bookings` |
| GET    | `/api/bookings/:id` |
| POST   | `/api/bookings/:id/payment-proof` |
| POST   | `/api/bookings/:id/cancel` |
| POST   | `/api/sessions/:id/register` |
| DELETE | `/api/sessions/:id/register` |
| GET    | `/api/sessions/my-registrations` |
| POST   | `/api/mood` |
| GET    | `/api/mood` |
| GET    | `/api/mood/stats?range=30d` |
| POST   | `/api/uploads/image` (multipart `file`) |
| POST   | `/api/uploads/audio` (multipart `file`) |

**Admin** (all under `/api/admin/*`, require role `ADMIN`)

| Method | Path |
|---|---|
| GET    | `/api/admin/stats` |
| GET/POST/PATCH/DELETE | `/api/admin/therapists[/:id]` |
| PATCH  | `/api/admin/therapists/:id/availability` |
| GET/POST/PATCH/DELETE | `/api/admin/sessions[/:id]` |
| GET    | `/api/admin/sessions/:id/registrations` |
| POST   | `/api/admin/sessions/:id/broadcast` |
| POST   | `/api/admin/sessions/:id/cancel` |
| PATCH  | `/api/admin/registrations/:id` |
| GET/POST/PATCH/DELETE | `/api/admin/articles[/:id]` |
| POST   | `/api/admin/articles/:id/publish` |
| POST   | `/api/admin/articles/:id/schedule` |
| GET/POST/PATCH/DELETE | `/api/admin/quotes[/:id]` |
| GET/POST/PATCH/DELETE | `/api/admin/faqs[/:id]` |
| PATCH  | `/api/admin/faqs/reorder` |
| GET/POST/PATCH/DELETE | `/api/admin/meditations[/:id]` |
| GET/POST/PATCH/DELETE | `/api/admin/nutrition/tips[/:id]` |
| GET/POST/PATCH/DELETE | `/api/admin/nutrition/meal-plans[/:id]` |
| GET    | `/api/admin/payments?status=pending` |
| GET    | `/api/admin/payments/history?status=approved\|rejected` |
| GET    | `/api/admin/payments/:id` |
| POST   | `/api/admin/payments/:id/approve` |
| POST   | `/api/admin/payments/:id/reject` |

## Response shape

```ts
// success (single)
{ data: T, message?: string }

// success (list)
{ data: T[], pagination?: { page, perPage, total, totalPages } }

// error
{ message: string, errors?: { field: string }, code?: string }
```

## Security notes

- Passwords hashed with bcrypt (cost 12).
- JWTs HS256, 7-day expiry.
- Auth + upload routes are rate-limited (5/min on auth, 3/hr on forgot-password, 20/min on uploads).
- CORS locked to `CORS_ORIGIN` (comma-separated) in production; permissive in development.
- Stack traces never leak — global error handler sanitizes any non-`ApiError`.
- Logger redacts `authorization`, `cookie`, `password`, `passwordHash`, `token` fields.
- Cross-user data leaks: every user-scoped detail/update endpoint verifies ownership against `c.get('user')`.

## Trauma-informed copy

Every error message is gentle and dignified — never "Invalid credentials" or "User not found." If you add new validators or services, keep the [voice consistent](#).

## Chatbot

Deferred. `ai` and `@ai-sdk/anthropic` are installed but unused in v1. See Section 16 of the implementation brief.
