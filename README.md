# CivicSync — Smart Compound Management System

Full-stack application: **Node/Express + MongoDB** backend with an **Angular** frontend.

> **Team task division and per-contributor evidence: see [`TASKS.md`](./TASKS.md).**

## Project structure

```
CivicSync/
├── index.js                # Backend entry point (Express + Socket.IO)
├── package.json            # Root scripts (start / seed / test)
├── .env                    # Environment variables (DB_URI, JWT_SECRET, EMAIL_*)
├── backend/                # Backend source
│   ├── config/             # DB connection
│   ├── controllers/        # HTTP layer
│   ├── services/           # Business logic
│   ├── models/             # Mongoose schemas
│   ├── routes/             # Express routers
│   ├── middleware/         # auth + role guards
│   ├── socket/             # Socket.IO handlers
│   ├── seed/               # adminSeed.js + demoSeed.js
│   ├── tests/              # npm test suite (*.test.js)
│   │   └── manual/         # hand-run socket / API probes (not part of npm test)
│   └── utils/              # statusConstants.js (single status vocabulary)
├── tools/
│   └── pdfgen/             # isolated pdfkit tool (own private package.json)
└── frontend/               # Angular application (single, unified frontend)
    └── src/
        ├── environments/   # runtime config (apiUrl, uploadUrl)
        ├── types/          # ambient module declarations (qrcode)
        └── app/
            ├── core/       # app-wide singletons — the ONLY home for shared logic
            │   ├── guards/         # auth-guard (role aware) + role-guard
            │   ├── interceptors/   # auth interceptor (JWT)
            │   ├── layout/         # authenticated shell + navigation map
            │   ├── models/         # status.ts (mirrors backend statusConstants)
            │   ├── services/       # auth, notification, chat-socket, theme, token-storage
            │   └── utils/          # filters, report-export, realtime-refresh
            ├── Models/     # feature DTO interfaces (maintenance, offers, reviews…)
            ├── Services/   # feature API clients that need the DTOs above
            ├── shared/     # presentational components (chart, dialog, avatar…)
            └── Components/ # feature screens, grouped by audience
                ├── admin/          # admin sub-pages + shared admin stylesheet
                ├── Residant/       # resident maintenance screens
                ├── Technician/     # technician screens
                ├── VisitorAccess/
                │   ├── layout/     # topbar
                │   ├── pages/
                │   │   ├── public/   # no account needed (request, OTP, QR, chat)
                │   │   ├── resident/ # resident-facing visitor screens
                │   │   └── security/ # guard-desk screens (scanner, check-in/out)
                │   └── services/   # visitor-flow + visit-status.util
                └── shared/         # cross-role components (notifications, toast)
```

### Where does a new file go?

| You are adding… | Put it in… |
| --------------- | ---------- |
| A singleton service, guard, interceptor or util used app-wide | `frontend/src/app/core/` |
| A DTO / response interface for one feature | `frontend/src/app/Models/` |
| An HTTP client for one feature | `frontend/src/app/Services/` |
| A reusable presentational component | `frontend/src/app/shared/components/` |
| A visitor/security screen | `frontend/src/app/Components/VisitorAccess/pages/<audience>/` |
| A manually run debug script | `backend/tests/manual/` |

`core/` is the single home for anything shared — there is no second copy of a
service, model, guard or theme, so "which one is real?" never comes up.

## Getting started

### 1. Backend

```bash
npm install            # from the project root
npm run seed:admin     # creates the admin account (from .env)
npm run seed:demo      # creates demo buildings, units, residents, security
npm start              # http://localhost:3000
```

Demo accounts created by `seed:demo` (password: `Password123`):

| Role     | Email                     |
| -------- | ------------------------- |
| Resident | resident@compound.com     |
| Resident | resident2@compound.com    |
| Security | security@compound.com     |
| Admin    | value of `ADMIN_EMAIL`    |

### 2. Frontend

```bash
cd frontend
npm install
npm start              # http://localhost:4200
```

The frontend talks to the backend at `http://localhost:3000/api`.

## Invoices, receipts and printing

Every invoice can be opened as a printable receipt, from every role that is
authorised to see it.

| Role | Where | Result |
| ---- | ----- | ------ |
| Admin | `/admin/invoices` → **View**, or a ticket's details → **Open invoice** | `/admin/invoices/:id` receipt page |
| Resident | `/resident/invoices` → **Receipt** | receipt in a modal |
| Technician | `/technician/job/:id` → **Print work order** | prints that job's details card |

**Print isolation.** The receipt is the only element carrying the
`invoice-print-area` class. The `@media print` block in `src/styles.css` is
scoped with `body:has(.invoice-print-area)`, so it hides the sidebar, topbar,
filters, buttons and every other card, and prints the invoice alone. Pages that
contain no receipt are untouched, so printing anything else behaves normally.
No popup window and no `window.location.reload()` is involved — both break in
normal use (popup blockers, lost SPA state). The technician work order uses the
same mechanism via `printElement()` in `core/utils/print.ts`.

**One receipt, three roles.** `shared/invoice/invoice-receipt.*` renders every
role's receipt, driven by `describeInvoice()` in `invoice.model.ts`, which
normalises the different API shapes into one view model. The printed document is
therefore identical for Admin, Resident and Technician.

**Maintenance invoices.** A `MaintenanceTicket` may be attached to an `Invoice`
(`invoice.ticketId`, unique + sparse). Those invoices appear in the resident's
invoices list alongside regular charges, labelled with a **Maintenance** badge
and linked to their ticket, and the admin's ticket details modal shows the
invoice raised for that job.

## Realtime updates

The app has one Socket.IO connection (`core/services/chat-socket.ts`). The
backend emits a single `notification:new` event, and the payload's `type` says
what changed.

On the backend, `notificationService.notifyRole()` fans an event out to every
active user with a role, which is how the admin console learns about changes
made by a technician (and vice versa). `RealtimeRefresh`
(`core/utils/realtime-refresh.ts`) is the one-line way for a screen to subscribe
and reload itself.

> **Subscribing to a notification `type` as if it were a socket event does
> nothing.** Listen on `notification:new` and filter by `payload.type` — this is
> the mistake that previously left the invoices screens stale.

## Visitor access flow (end to end)

1. **Visitor request** — a visitor submits a request (`/visitor-request`) by picking an occupied unit, date, and time.
2. **Email OTP** — an OTP is emailed; the visitor verifies it (`/otp-verification`).
3. **Resident decision** — the resident reviews the request (`/resident/visitors`) and approves or rejects.
   - On **approve**, the backend immediately issues the QR pass (`QR_GENERATED`) and a visitor chat token.
4. **Status + QR** — the visitor tracks progress (`/visitor-request-status`) and shows the QR pass (`/qr-code-display`), a real QR image rendered from the backend `qrToken`.
5. **Security scan** — security opens the real camera scanner (`/security/visitors/scanner`). The code is decoded in the browser (jsQR) and verified against the backend (`POST /api/visits/scan`).
6. **Check-in / check-out** — security confirms entry/exit (`/security/visitors/check-in-out`), which calls the backend state machine.

Resident-invite flow (a resident inviting a visitor directly) runs through the same state machine, with the OTP/QR issued on approval.

The old flat URLs (`/security-dashboard`, `/qr-scanner`, `/check-in-out`, `/resident-visitor-requests`, …) are kept as redirects in `app.routes.ts`, so existing bookmarks keep working.

## Scripts

| Location        | Command             | Description                        |
| --------------- | ------------------- | ---------------------------------- |
| root            | `npm start`         | Run the backend                    |
| root            | `npm run dev`       | Run the backend with watch         |
| root            | `npm run seed:admin`| Seed the admin account             |
| root            | `npm run seed:demo` | Seed demo compound data            |
| root            | `npm test`          | Backend test suite (`node --test`) |
| frontend        | `npm start`         | Angular dev server                 |
| frontend        | `npm run build`     | Production build                   |
| frontend        | `npm test`          | Unit tests (Vitest)                |
| tools/pdfgen    | `npm install`       | Install the isolated pdfkit tool   |