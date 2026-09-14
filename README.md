# BankFlow

BankFlow is a **fictional digital banking web application** built specifically as a realistic, production-like target for **advanced Playwright browser-automation practice**.

> ⚠️ **This is a demo application.** It contains no real banking functionality, no real customer data, and processes no real money. All names, accounts, balances, and transactions are synthetic. Do not enter real personal or financial information anywhere in this app.

It is a full-stack app — React/TypeScript frontend, Node/Express/TypeScript backend, PostgreSQL database, Socket.IO real-time notifications, JWT + OTP authentication, role-based access control, a controllable **Chaos Mode**, an **API Testing Lab**, and a **25-challenge Playwright Challenge Lab** — all backed by real API calls and a real database, not static mock data.

---

## 1. Project structure

```
bankflow/
├── frontend/            React + TypeScript + Vite + Tailwind SPA
│   └── src/{components,pages,layouts,hooks,services,utils,types,webcomponents}
├── backend/              Node + TypeScript + Express REST API + Socket.IO
│   └── src/{controllers,services,repositories,routes,middleware,validators,utils,sockets,config,db}
├── database/
│   ├── migrations/       Numbered plain-SQL migrations
│   └── seeds/seed.ts     Seed script (also used by POST /api/dev/reset)
├── docker-compose.yml
├── .env.example
└── README.md
```

Clean layering on the backend: **routes → controllers → services → repositories**, with `middleware/` (auth, validation, error handling, rate limiting, chaos injection) and `validators/` (Zod schemas) cutting across.

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router v6, TanStack Query, react-hook-form, Recharts, socket.io-client |
| Backend | Node 22, TypeScript, Express, `pg` (node-postgres), JWT, bcryptjs, Zod, Socket.IO, Multer, PDFKit |
| Database | PostgreSQL 16 (Docker) — see note below for local dev without Docker |
| Infra | Docker Compose (postgres + backend + nginx-served frontend) |

### A note on running Postgres without Docker

If Docker isn't available on your machine, the backend can boot a **real, local PostgreSQL 17 binary** automatically (no admin rights required) via the `embedded-postgres` package — no mocking, no SQLite substitution. Set `USE_EMBEDDED_POSTGRES=true` in `backend/.env` (see [Setup](#4-setup--running-the-app) below). Docker + a standalone `postgres:16-alpine` container remains the primary, documented deployment path.

---

## 3. Environment variables

Copy `.env.example` to `.env` at the repo root (read by `docker-compose.yml`) and/or to `backend/.env` / `frontend/.env` for non-Docker development.

Key variables (see `.env.example` for the full, commented list):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `USE_EMBEDDED_POSTGRES` | `true` to boot a local Postgres binary instead of connecting to `DATABASE_URL` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | JWT signing secrets |
| `OTP_EXPIRES_IN_SECONDS` / `OTP_LENGTH` | OTP behavior |
| `LOGIN_MAX_ATTEMPTS` / `LOGIN_LOCKOUT_MINUTES` | Account lockout policy |
| `VITE_API_BASE_URL` / `VITE_SOCKET_URL` | Frontend → backend endpoints |
| `AUTO_MIGRATE` / `AUTO_SEED_IF_EMPTY` | Docker-only convenience: migrate on boot, and seed only if the DB is empty |

Secrets are never hard-coded; every credential in the repo is either a placeholder in `.env.example` or a clearly-labeled fictional test credential (see below).

---

## 4. Setup & running the app

### Option A — Docker (recommended, primary path)

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:8080
- Backend API: http://localhost:4000/api
- The backend automatically migrates the schema and seeds demo data on first boot (only if the database is empty), so there's nothing else to run.

### Option B — Local development without Docker

Requires Node 22+. If you don't have PostgreSQL installed locally, the backend can boot one itself (see below) — no Docker or admin rights needed.

```bash
npm install                     # installs both workspaces (root, uses npm workspaces)

# backend/.env
cp .env.example backend/.env
# then edit backend/.env and set:
#   USE_EMBEDDED_POSTGRES=true
#   DATABASE_URL=postgresql://bankflow:bankflow@localhost:54329/bankflow

npm run db:migrate --workspace backend
npm run db:seed --workspace backend

npm run dev --workspace backend     # http://localhost:4000
npm run dev --workspace frontend    # http://localhost:5173
```

If you do have a real local/remote Postgres instance, just point `DATABASE_URL` at it and leave `USE_EMBEDDED_POSTGRES=false` (default).

### Resetting demo data

```bash
npm run db:seed --workspace backend        # re-seeds from the CLI (drops & rebuilds all demo data)
```

or, while the app is running, as an **ADMIN** user, use **"Reset All to Normal"** for Chaos Mode plus:

```
POST /api/dev/reset
```

which truncates and re-seeds the entire database. This endpoint (and the rest of `/api/dev/*`) is **automatically disabled (404) whenever `NODE_ENV=production`**.

---

## 5. Test credentials

| Role | Username | Password |
|---|---|---|
| Customer | `customer01` | `Test@123` |
| Support Agent | `support01` | `Test@123` |
| Admin | `admin01` | `Admin@123` |

The seed script also creates 7 additional fictional customers (`customer02`–`customer08`, same password) with their own accounts, transactions, beneficiaries, and cards.

**Every account has MFA/OTP enabled.** Since this is a demo with no real SMS/email provider, the OTP is echoed back in the API response body (`devOtp`) and shown directly on the login/OTP screen whenever `NODE_ENV !== production` — this is what makes automated login flows scriptable without needing a real inbox.

---

## 6. API endpoint reference

All endpoints are namespaced under `/api`. Full request/response shapes are best explored live via the in-app **API Testing Lab** (`/dev/api-lab`, admin-only), which lets you fire real requests and inspect status code + timing + payload.

<details>
<summary>Auth — <code>/api/auth</code></summary>

- `POST /login` — username/password → OTP challenge or session
- `POST /verify-otp` — completes login
- `POST /resend-otp`
- `POST /refresh` — silent access-token refresh via httpOnly cookie
- `POST /logout`
- `POST /forgot-password` / `POST /reset-password`
- `POST /change-password`
</details>

<details>
<summary>Accounts — <code>/api/accounts</code></summary>

- `GET /` — list my accounts
- `GET /:id` — account detail + interest info
</details>

<details>
<summary>Transactions — <code>/api/transactions</code></summary>

- `GET /?page=&limit=&accountId=&type=&status=&direction=&dateFrom=&dateTo=&amountMin=&amountMax=&q=&sort=` — server-side paginated search
</details>

<details>
<summary>Transfers — <code>/api/transfers</code></summary>

- `POST /quote` — validate + preview a transfer (no side effects)
- `POST /` — create a pending transfer, issues OTP
- `POST /:id/verify-otp` — completes the transfer
</details>

<details>
<summary>Beneficiaries — <code>/api/beneficiaries</code></summary>

- `GET /`, `PATCH /:id`, `DELETE /:id`
- `POST /` — starts adding a beneficiary, issues OTP
- `POST /confirm` — completes it
- `POST /:id/activate`, `POST /:id/deactivate`
</details>

<details>
<summary>Payments — <code>/api/payments</code></summary>

- `GET /billers?category=`
- `POST /bills/lookup`
- `GET /`, `POST /` (issues OTP), `POST /:id/verify-otp`
</details>

<details>
<summary>Cards — <code>/api/cards</code></summary>

- `GET /`, `GET /:id/transactions`
- `POST /:id/block`, `POST /:id/unblock`, `POST /:id/freeze`
- `PATCH /:id/limit`
</details>

<details>
<summary>Statements — <code>/api/statements</code></summary>

- `GET /?accountId=`, `POST /generate`
- `GET /:id/download.pdf`, `GET /:id/download.csv` (real generated files)
</details>

<details>
<summary>Notifications — <code>/api/notifications</code></summary>

- `GET /`, `PATCH /:id/read`, `PATCH /read-all`, `DELETE /:id`
- Pushed live over Socket.IO (`notification:new`) to room `user:<id>`
</details>

<details>
<summary>Profile — <code>/api/profile</code></summary>

- `GET /`, `PATCH /`
- `POST /sensitive-update/initiate` / `POST /sensitive-update/confirm` (email/phone changes require OTP)
- `POST /photo` (multipart upload)
- `PATCH /preferences` (dashboard widget order, etc.)
- `GET|POST /documents`, `GET /documents/:id/download`
</details>

<details>
<summary>Security — <code>/api/security</code></summary>

- `GET /sessions`, `DELETE /sessions/:id`, `POST /logout-all`
- `GET /login-history`
- `PATCH /mfa`
</details>

<details>
<summary>Admin (ADMIN only) — <code>/api/admin</code></summary>

- `GET /stats`, `GET /system-health`
- `GET /users`, `POST /users/:id/{activate,deactivate,lock,unlock}`
- `GET /accounts`, `GET /transactions`, `GET /audit-logs`
</details>

<details>
<summary>Support (SUPPORT_AGENT/ADMIN) — <code>/api/support</code></summary>

- `GET /customers?search=`, `GET /customers/:id`, `GET /customers/:id/transactions` (read-only)
</details>

<details>
<summary>Dev tools (ADMIN + non-production only) — <code>/api/dev</code></summary>

- `GET|PUT /chaos-config`, `POST /chaos-config/reset`
- `POST /reset` — reset demo environment
- `GET /api-lab/endpoints`
- `GET /challenges`, `POST /challenges/:id/reset`
</details>

---

## 7. Chaos Mode

Reachable at **`/dev/chaos`** as an ADMIN user (also 404s outside development). Off by default — every route behaves deterministically ("Normal Mode") until a rule is explicitly enabled.

Per-route controls:

| Control | Effect |
|---|---|
| **Enabled** | Master switch for that route |
| **Delay (ms)** | Artificial latency before responding |
| **Fail N times** | Return a failure this many times, then self-heal to a normal response (great for testing retry logic) |
| **Fail status** | Which HTTP status to return while failing (400/401/403/404/409/422/429/500/502/503) |
| **Simulate timeout** | Never respond at all — the client hits its own timeout, like a hung upstream |

20 routes are pre-wired for chaos, spanning auth, accounts, transactions, transfers, beneficiaries, payments, cards, statements, notifications, and profile. Example scenario: set `POST /api/transfers/` to **fail 1 time with 500**, then attempt a transfer in the UI — it fails once and succeeds on retry, exactly like a flaky upstream service.

---

## 8. Playwright Challenge Lab

**`/dev/challenges`** (ADMIN + non-production) lists all **25 challenges**, each with an ID, title, difficulty, description, starting page, expected behavior, and a per-challenge **Reset** button (re-seeds the environment). No solutions are provided — write your own Playwright scripts against the real app.

Highlights: dynamic transaction lookup, filtering/sorting/pagination, the full OTP-gated transfer flow (rendered inside a real `<iframe>`), adding/deleting beneficiaries, PDF/CSV downloads, profile photo upload, a Shadow DOM balance widget, a second-tab/window policy page, Chaos-Mode-driven delay/retry scenarios, live WebSocket notifications, session expiration, and role-based access control.

---

## 9. Automation-friendly surfaces (by design)

- **iframe**: the transfer OTP step renders inside a real `<iframe>` (`/embedded/otp-verify`), a simulated "secure verification" widget.
- **Shadow DOM**: `<bf-balance-card>` (dashboard) and `<bf-rating-widget>` (feedback) are genuine custom elements with open shadow roots.
- **Multiple tabs/windows**: "Bank Policy" in the top bar opens a second page via `target="_blank"`.
- **File upload**: profile photo (`/profile`) and a fictional document-verification upload.
- **File download**: real generated PDF and CSV statements (via authenticated blob download, since auth is Bearer-token based).
- **Drag and drop**: dashboard widgets can be reordered by dragging; order persists per-user.
- **Dynamic content**: notifications arrive live over Socket.IO without a page refresh; Chaos Mode changes API timing/outcomes at runtime.
- Locators are a deliberate mix: labeled form fields (`getByLabel`), semantic tables/roles, and some `data-testid`s on genuinely ambiguous elements (table rows, widgets, cards) — not on every element.

---

## 10. What's intentionally simplified

In the interest of shipping a coherent, fully-working app rather than a sprawling half-finished one:

- The iframe-based OTP pattern is used for the **transfer** flow (the flagship "handle an iframe" challenge). Beneficiary, payment, and profile OTP steps use the same real OTP mechanism but as an inline form rather than a second iframe.
- There's no recurring/scheduled-transfer feature (no "scheduled transfers" dashboard widget) — everything shown is backed by real, already-persisted data.
- The API Testing Lab lets you fire real authenticated requests from the browser directly (reusing the same session) rather than routing through a separate backend proxy endpoint.
- Audit logging covers the key security-relevant actions (logins, lockouts, admin user-status changes) rather than every possible mutation.

---

## 11. Commands reference

Run from the repo root unless noted.

```bash
npm install                              # install all workspaces
npm run dev:backend                      # backend dev server (tsx watch)
npm run dev:frontend                     # frontend dev server (Vite)
npm run build:backend / build:frontend   # production builds
npm run typecheck                        # typecheck both workspaces
npm run db:migrate                       # apply pending SQL migrations
npm run db:seed                          # truncate + reseed all demo data

docker compose up --build                # full stack via Docker
docker compose down -v                   # stop + wipe the Postgres volume
```

---

## 12. Database schema

Tables: `roles`, `users`, `accounts`, `transactions`, `beneficiaries`, `transfers`, `payments`, `cards`, `statements`, `notifications`, `sessions`, `login_history`, `audit_logs`, `otp_codes`, `documents`, `chaos_config`. See `database/migrations/*.sql` for full DDL, foreign keys, and indexes.

---

## 13. Architecture overview

```
┌─────────────┐      HTTPS/REST + WebSocket      ┌──────────────┐
│  React SPA  │ ───────────────────────────────▶ │  Express API │
│  (Vite)     │ ◀─────────────────────────────── │  + Socket.IO │
└─────────────┘         JSON / JWT                └──────┬───────┘
                                                          │ pg (node-postgres)
                                                          ▼
                                                   ┌──────────────┐
                                                   │  PostgreSQL  │
                                                   └──────────────┘
```

Auth: short-lived JWT access token (in memory on the client) + long-lived refresh token (httpOnly cookie scoped to `/api/auth`), with silent refresh on 401 via an axios interceptor. MFA/OTP is required on every account by default.
