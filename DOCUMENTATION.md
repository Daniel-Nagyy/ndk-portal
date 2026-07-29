# NDK Dispatch Portal — Technical Documentation

A multi-tenant fleet-dispatch platform for Amazon Relay DSPs (Delivery Service
Partners). It centralizes everything a dispatcher/owner needs to run a fleet —
Hours-of-Service (HOS) readiness, Netradyne safety alerts, Amazon Relay trip
monitoring, a daily operations recap, and a down-truck tracker — into one
role-based web app, and pushes real-time alerts to phones.

---

## 1. What the system does (functional overview)

The portal serves several **accounts** (one per DSP client, e.g. "Portable",
"Mako Waves Distribution"). Each account has its own users, its own integration
credentials, and its own alerts. Data never crosses accounts.

**Core capabilities:**

| Area | What it does |
|---|---|
| **Auth & tenancy** | Real login (no hardcoded users), role-based access, per-account data isolation. |
| **HOS readiness** | Pulls live Hours-of-Service data from Geotab and shows each driver's break/drive/shift/cycle clocks and READY/NOT READY status. Fires alerts at 60 & 30 minutes remaining. |
| **Netradyne alerts** | Scrapes the Netradyne safety portal for driver events (drowsiness, hard braking, etc.) and shows/pushes them. |
| **Amazon Relay monitoring** | A browser extension watches the Relay board and raises alerts for bobtail-not-cleared and imminent arrivals/departures. |
| **Daily Recap** | A per-day operations table (driver, trip, block, VRIDs, HOS check, issues, starting message…), editable, searchable, exportable/printable. |
| **Truck Tracker** | Logs down trucks with issue, date, work-order (WO) number, and Active/Inactive status. |
| **Notifications** | Web Push to phones + Telegram, account-scoped, deduplicated. |

**User roles:** `superadmin` (platform admin, manages accounts/users),
`owner` (sees their account's data, read-mostly), `manager`, `dispatcher`
(operates the fleet, edits recaps and trucks).

---

## 2. Architecture

### 2.1 The "collector + brain" model

The hardest constraint is that **Amazon Relay has no API** and scraping it from a
datacenter IP risks bans. The system solves this by splitting responsibilities:

```
  ┌─────────────────────────┐         ┌──────────────────────────────┐
  │  BROWSER EXTENSION       │  HTTPS  │  PORTAL (Railway)            │
  │  (Chrome, MV3)           │ ──────▶ │  Node.js server              │
  │  - runs on a real,       │  POST   │  - multi-tenant API + web UI │
  │    logged-in browser     │ X-API-  │  - SQLite database           │
  │  - residential IP        │  Key    │  - Web Push + Telegram        │
  │  - scrapes Relay board   │         │  - Geotab + Netradyne polling │
  └─────────────────────────┘         └──────────────┬───────────────┘
                                                       │ Web Push / Telegram
                                                       ▼
                                          Owner + Dispatcher phones
```

- **Extension = live collector.** It runs inside a real, logged-in Chrome on a
  residential IP (no ban risk, and it can read the Relay board a server can't).
  It detects events and POSTs them to the Portal, authenticated by an
  **account API key**.
- **Portal = the brain.** It stores everything, computes HOS, polls Netradyne,
  serves the dashboard, and fans alerts out to phones — all account-scoped.

### 2.2 Multi-tenancy

Every account row has an `api_key`. Every user, push subscription, recap, and
down-truck row carries an `account_id`/`client_id`. All reads/writes are filtered
by the logged-in user's account (superadmin/admin can see all). This is what
guarantees Freedom's alerts never reach Portable's phones.

---

## 3. Technology stack

### Backend
- **Runtime:** Node.js (ES Modules, `.mjs`).
- **HTTP server:** the built-in `node:http` / `node:https` modules — **no web
  framework** (no Express). Routing is a manual `if (url.pathname === …)` chain
  in `server.mjs`.
- **Database:** **SQLite** via **`better-sqlite3`** (synchronous, file-based).
- **Password hashing:** **`bcryptjs`**.
- **Credential encryption:** **AES-256-GCM** (Node `crypto`), keyed by
  `APP_ENCRYPTION_KEY`, for the Geotab/Netradyne/Telegram secrets stored per
  account.
- **Sessions:** server-side session tokens in a `sessions` table, delivered as an
  **HttpOnly, SameSite=Lax** cookie (`ndk_session`).
- **Web Push:** **`web-push`** library with **VAPID** keys.
- **Config:** **`dotenv`** for environment variables.

### Frontend
- **Vanilla JavaScript single-page app** — one large IIFE in `app.js` (no React/
  Vue). State is a plain object; the UI is re-rendered by rebuilding
  `innerHTML`. `index.html` + `styles.css` complete the shell.
- **PWA (Progressive Web App):** installable to a phone's home screen, with a
  **Service Worker** (`sw.js`) that caches the app shell and handles incoming
  push events.

### Integrations
- **Geotab:** JSON-RPC API (`Authenticate`, `Get` DutyStatusLog/Availability)
  over HTTPS — server-side.
- **Netradyne:** **Playwright** (headless Chromium) logs into the Netradyne web
  console and captures its internal REST responses — server-side.
- **Amazon Relay:** a **Chrome extension (Manifest V3)** scrapes the DOM of the
  Relay board — client-side, on the dispatcher's browser.
- **Telegram:** the Telegram **Bot API** for chat alerts.

### Deployment / Ops
- **Host:** **Railway**.
- **Container:** **Docker**, based on the official **Playwright** image
  (`mcr.microsoft.com/playwright`), so headless Chromium is available for
  Netradyne. Runs in `USE_HTTP=1` mode behind Railway's TLS.
- **Persistence:** a **Railway Volume** holds the SQLite file (`DB_PATH`) so data
  survives redeploys.

---

## 4. Codebase map

### Server (`/`)
| File | Responsibility |
|---|---|
| `server.mjs` | HTTP server, all API routes, static file serving, CORS, boot. |
| `db.mjs` | SQLite schema + all data access (accounts, users, sessions, subscriptions, recaps, down_trucks), first-run bootstrap. |
| `auth.mjs` | Session cookie helpers, `getAuthUser`, role/account access checks. |
| `crypto.mjs` | AES-256-GCM encrypt/decrypt for stored credentials. |
| `geotab.mjs` | Geotab auth + HOS **readiness** computation (`computeReadiness`). |
| `hos-engine.mjs` | Background loop: per-account Geotab poll, fires HOS alerts at 60/30 min. |
| `notify.mjs` | `notifyAccount` → Web Push (`sendPushToAccount`) + Telegram (`sendTelegramToAccount`). |
| `push.mjs` | VAPID setup / public key. |
| `ingest-store.mjs` | In-memory per-account store for live Relay late-items from the extension. |
| `netradyne/auth.js` | Per-account Playwright Chromium login to Netradyne. |
| `netradyne/scraper.js` | Captures Netradyne alert API responses, maps event codes → severity. |
| `netradyne/poller.js` | Per-account Netradyne polling loop (staggered, min 5-min interval). |

### Frontend (`/`)
| File | Responsibility |
|---|---|
| `app.js` | The entire web app (views, rendering, event handling, API calls). |
| `index.html` | App shell + PWA manifest link. |
| `styles.css` | All styling (desktop + responsive/mobile). |
| `sw.js` | Service worker: app-shell caching (network-first) + push handler. |

### Extension (`extension-ndk/`)
| File | Responsibility |
|---|---|
| `manifest.json` | MV3 manifest (Relay + Portal host permissions, alarms, notifications). |
| `content.js` | Scrapes the Relay board; detects bobtail / arrival / departure. |
| `background.js` | Service worker: dedupe, POST alerts to the Portal, Telegram fallback. |

### Scripts (`scripts/`)
One-off provisioning/maintenance run against the production DB
(`create-freedom.mjs`, `clear-recaps.mjs`).

---

## 5. Data model (SQLite tables)

- **`accounts`** — one per DSP client. Columns: `id`, `name`, encrypted Geotab
  (`geotab_*`), Netradyne (`netradyne_*`), Telegram (`telegram_*`) credentials,
  and `api_key` (the extension's per-account key).
- **`users`** — `id`, `account_id`, `email` (unique), `name`, `role`,
  `password_hash`.
- **`sessions`** — `token`, `user_id`, `expires_at`.
- **`push_subscriptions`** — `user_id`, `account_id`, `endpoint` (unique),
  `sub_json` (the Web Push subscription). **Account-scoped** — this is how push
  stays isolated per account.
- **`recaps`** — `id`, `client_id` (account), `daily_date`, `payload` (JSON of the
  whole recap row).
- **`down_trucks`** — `id`, `account_id`, `truck_number`, `issue`, `wo_number`,
  `down_date`, `status` (Active/Inactive).

Credentials are **encrypted at rest** (AES-256-GCM); passwords are **bcrypt
hashes**. Neither is ever sent to the browser.

---

## 6. The notification pipeline (the core feature)

### 6.1 Sources of alerts

1. **Extension → Relay events** (`content.js`):
   - **Bobtail not cleared** — a tour still in the *Upcoming* tab at 15 min and
     again at 5 min before start → **push + Telegram**.
   - **Arrival / departure** — an in-transit stop within 10 min → **Telegram
     only** (no push), and never from the Upcoming page.
2. **HOS engine** (`hos-engine.mjs`) — server polls Geotab and fires at 60 and
   30 minutes remaining on any HOS clock.
3. **Netradyne poller** — new safety events surface on the dashboard and can push.

### 6.2 Delivery path

```
extension ──POST /api/ingest/alert (X-API-Key)──▶ getAccountByApiKey(key)
                                                        │
                                                        ▼
                                              notifyAccount(accountId, {...})
                                                 ├── sendPushToAccount → Web Push (VAPID) to
                                                 │     every push_subscription for that account
                                                 └── sendTelegramToAccount → account's Telegram bot/chat
```

- **Dedupe (no spam):** the extension keeps a persistent `sentAlerts` map (6-hour
  TTL) so the 2-minute page reloads never re-send; the server adds a second
  ~9-minute cooldown per alert key.
- **Push vs Telegram:** an alert can carry `push: false` (used by
  arrival/departure) so it goes to Telegram only.
- **Account scoping:** push goes only to `push_subscriptions WHERE account_id =
  <account>`, so an account's alerts reach only that account's phones.

### 6.3 Requirements for delivery to work

- **VAPID keys** configured on the server (`pushConfigured`).
- Each recipient has **subscribed** (Settings → Enable notifications) **while
  logged into their own account**. On **iPhone**, web push works only from the
  **installed PWA** (Add to Home Screen), not a Safari tab.
- The account has a **Telegram** chat configured (needed for the Telegram-only
  arrival/departure alerts).
- The extension's `ACCOUNT_API_KEY` matches the Relay account that browser is
  logged into.

---

## 7. Integrations in detail

### 7.1 Geotab (HOS)
- Server-side **JSON-RPC** to `https://<server>/apiv1`. Authenticates with the
  account's `database`/`username`/`password`, then reads duty-status and
  availability to compute each driver's remaining **break / drive / shift / cycle**
  time and a READY / NOT READY / NO LOGS readiness. The **database** field is
  required — without it the endpoint falls back to a default account.
- `/api/drivers-readiness` serves this to the UI; `hos-engine.mjs` uses the same
  computation for background alerting.

### 7.2 Netradyne
- No public API. `netradyne/auth.js` uses **Playwright** to log into the Netradyne
  console with the account's credentials (kept in a per-account Chromium profile).
  `scraper.js` captures the console's own REST responses
  (`alertsDataLite`, `getVisibleAlerts`), maps event codes to **severity**
  (Severe/Moderate/Low) and humanized names, and returns normalized alerts.
- `poller.js` runs one polling loop per account, staggered, minimum 5-minute
  interval, to avoid hammering Netradyne.

### 7.3 Amazon Relay (extension)
- MV3 content script scrapes the Relay board via stable `data-*` attributes
  (not the volatile CSS class names). It parses "Starts in", stop times, driver
  assignment, and VRIDs, then messages the background worker, which POSTs to the
  Portal. Geotab was removed from the extension — it is **Relay-only**.

---

## 8. Feature reference

- **Daily Recap** — per-day table (desktop) / expandable cards (mobile). Editable
  cells, all VRIDs shown and editable, add/delete rows (DB-backed with real
  server delete), calendar date picker, search, and Export/Print (via a hidden
  print iframe so mobile doesn't get stuck). Stored in the `recaps` table and
  synced on edit.
- **Truck Tracker** — compact table (desktop) / cards (mobile). Fields: Truck #,
  Issue, Date, WO #, Status (Active/Inactive). Search + status filter. Dispatchers
  add/edit; **owners are read-only** (enforced server-side). DB-only, never
  localStorage.
- **HOS Risks** — live readiness board, default sorted **risk-first**, with
  search/filter; mobile card layout.
- **Netradyne Alerts** — dashboard of captured safety events with acknowledge.
- **Accounts admin** (superadmin) — create/edit/delete accounts with Geotab,
  Netradyne, and Telegram credentials; copy each account's extension **API key**.

---

## 9. API reference (selected)

**Auth:** `POST /api/login`, `POST /api/logout`, `GET /api/me`,
`POST /api/change-password`.

**Admin (superadmin):** `GET/POST/PUT/DELETE /api/admin/accounts`,
`GET/POST /api/admin/users`, `GET /api/health` (readiness snapshot),
`GET /api/push/debug` (subscription audit).

**HOS:** `GET/POST /api/drivers-readiness`, `GET/POST /api/hos`.

**Recaps:** `GET /api/recaps`, `POST /api/recaps/sync`, `POST /api/recaps/delete`.

**Truck Tracker:** `GET/POST/DELETE /api/down-trucks`.

**Netradyne:** `GET /api/netradyne/alerts`, `GET /api/netradyne/summary`,
`PATCH /api/netradyne/alerts/:id`, `GET /api/netradyne/status`.

**Extension ingest (X-API-Key):** `POST /api/ingest/late-items`,
`POST /api/ingest/alert`, `GET /api/ingest/status`, `GET /api/late-items`.

**Push:** `GET /api/push/vapid-public-key`, `POST /api/push/subscribe`,
`POST /api/push/unsubscribe`.

**Testing:** `GET /api/test-alert?apiKey=<key>&type=hos|netradyne&critical=1|0`
— sends a real alert to a specific account and returns the delivery result
(`deviceSubscriptions`, `push.sent`, `telegram`).

---

## 10. Security model

- **AuthN:** bcrypt-hashed passwords; session tokens in an HttpOnly cookie.
- **AuthZ:** every endpoint checks role + account. Non-admins are pinned to their
  own `account_id`; owners are read-only on the Truck Tracker.
- **Secrets:** Geotab/Netradyne/Telegram credentials are AES-256-GCM encrypted at
  rest and never returned to the client (only booleans like `hasGeotab`).
- **API keys:** each account has an opaque `ndk_…` key used only by its extension
  for ingest; a wrong key routes data to the wrong account (the one operational
  footgun — verified with the `whoami` test).
- **CORS:** the extension origin is allowed to send the `X-API-Key` header.
- **Push isolation:** subscriptions are stored with `account_id`; sends are
  filtered by account, so cross-account leakage is impossible at the delivery
  layer.

---

## 11. Deployment & operations

- **Platform:** Railway, Docker (Playwright base image), `USE_HTTP=1`.
- **Persistent volume (critical):** SQLite is ephemeral unless `DB_PATH` points at
  a mounted volume; otherwise accounts, users, recaps, trucks, and push
  subscriptions reset on every redeploy.
- **Required env vars:** `APP_ENCRYPTION_KEY` (credential decryption),
  `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` (push), `SUPERADMIN_EMAIL` /
  `SUPERADMIN_PASSWORD` (first-run admin), `DB_PATH` (volume path), `USE_HTTP=1`.
  Optional: `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` (global Telegram fallback),
  `COOKIE_SECURE=0` (only for local HTTP testing).
- **Health check:** `GET /api/health` (superadmin) reports `pushConfigured`,
  `encryptionKeySet`, `dbOnVolume`, `telegramGlobalConfigured`, and per-account
  push-subscriber counts.

### Run locally
```bash
$env:USE_HTTP=1; $env:COOKIE_SECURE=0; node server.mjs   # http://localhost:4173
```

---

## 12. Glossary (tech terms)

- **DSP** — Delivery Service Partner; a company running trucks under Amazon Relay.
- **HOS** — Hours of Service; federal driving-time limits (break/drive/shift/cycle).
- **VRID** — Amazon's trip/load identifier.
- **Bobtail** — a truck driving without a trailer; "clearing the bobtail" = the
  driver moving off the Upcoming board to start the tour.
- **Multi-tenant** — one app instance serving many isolated customer accounts.
- **PWA** — Progressive Web App; a website installable like a native app, with a
  service worker for offline/push.
- **Service Worker** — a background script the browser runs for a site; handles
  caching and incoming push notifications.
- **Web Push / VAPID** — the browser standard for server-sent push notifications;
  VAPID keys identify/authorize the sending server.
- **Manifest V3 (MV3)** — the current Chrome extension platform (background
  service worker, declarative permissions).
- **Content script** — extension code injected into a web page (here, the Relay
  board) to read/act on its DOM.
- **JSON-RPC** — a remote-procedure-call protocol over JSON (used by Geotab).
- **Playwright** — a headless-browser automation library (used to log into and
  scrape Netradyne server-side).
- **SQLite / better-sqlite3** — a self-contained file database and its fast
  synchronous Node driver.
- **AES-256-GCM** — an authenticated symmetric encryption algorithm (protects
  stored credentials).
- **bcrypt** — a slow password-hashing function resistant to brute force.
- **IIFE** — Immediately Invoked Function Expression; the pattern wrapping the
  whole frontend to keep its scope private.
- **Ingest** — the extension→Portal data intake endpoints, authenticated by the
  account API key.
- **Dedupe / cooldown** — suppressing repeat alerts for the same event within a
  time window.

---

*Generated as living documentation — update alongside the code.*
