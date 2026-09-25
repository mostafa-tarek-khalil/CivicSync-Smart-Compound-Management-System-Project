# CivicSync — Team Task Division

Five contributors. Below is the agreed split, and then a detailed account of
**my** part with the concrete artifacts that back it up.

---

## Task Division

### جمال

**Backend**
1. Resident Endpoints
2. Technician Endpoints

**Frontend**
1. Resident Pages
2. Update Technician Pages

### مينا

**Frontend**
1. Technician pages

### احمد ماهر

**Backend**
1. Admin Endpoints

### سما

**Backend**
1. Notification Services

**Frontend**
1. Visitor Pages
2. Security Pages
3. Notification Page

### نيرة

**Frontend**
1. Admin Pages

---

## My Part

### Backend

1. Visitor Endpoints
2. Security Endpoints
3. Chat Endpoints
4. Auth & Registration integration Endpoints
5. Backend Integration & Fixes

### Frontend

1. Shared Frontend Infrastructure (core layout, guards, socket client)
2. OTP Verification Page (rebuilt)
3. Invoice Receipt & Printing (all roles)

---

## Evidence — Backend

### 1. Visitor Endpoints

`backend/routes/visitRoutes.js` — the public visitor flow (no account required):
submitting a request, receiving and verifying the OTP, and getting the QR pass.

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| POST | `/api/visits/visitor-requests` | Submit a visitor request |
| GET | `/api/visits/visitor-units` | Occupied units a visitor may choose |
| POST | `/api/visits/visitor-requests/:id/otp` | Issue the email OTP |
| POST | `/api/visits/visitor-requests/:id/otp/verify` | Verify the OTP |
| GET | `/api/visits/visitor-requests/lookup` | Find my requests by email |
| GET | `/api/visits/visitor-requests/:id/status` | Track request status |
| POST | `/api/visits/visitor-requests/:id/qr` | Mint the QR pass |

Resident-facing decision endpoints on the same router:

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/visits/visitor-requests` | Requests awaiting the resident |
| PATCH | `/api/visits/visitor-requests/:id/approve` | Approve (issues QR + chat token) |
| PATCH | `/api/visits/visitor-requests/:id/reject` | Reject |
| POST | `/api/visits` | Resident invites a visitor directly |
| GET | `/api/visits` | The resident's own visits |

Implementation lives in `backend/services/visitService.js`, which owns the visit
state machine (`PENDING → APPROVED → QR_GENERATED → QR_SCANNED → CHECKED_IN →
CHECKED_OUT`, plus `REJECTED` / `EXPIRED`).

### 2. Security Endpoints

Visitor access control at the guard desk:

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| POST | `/api/visits/scan` | Scan and verify a QR pass |
| GET | `/api/visits/security/visits` | Visits for the security desk |
| GET | `/api/visits/security/visits/:id` | One visit's details |
| PATCH | `/api/visits/:id/check-in` | Confirm entry |
| PATCH | `/api/visits/:id/check-out` | Confirm exit |

All five sit behind `authMiddleware` + `roleMiddleware("SECURITY")`.

### 3. Chat Endpoints

`backend/routes/chatRoutes.js` + `backend/services/chatService.js`, with realtime
delivery in `backend/socket/chatSocket.js`.

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/chat/users/search` | Find someone to message |
| POST | `/api/chat/direct` | Open a direct conversation |
| GET | `/api/chat/groups/compound` | Compound-wide group |
| GET | `/api/chat/groups/building/:buildingId` | Building group |
| GET | `/api/chat/conversations` | My conversations |
| GET | `/api/chat/conversations/:id` | One conversation |
| GET | `/api/chat/conversations/:id/messages` | Message history |
| POST | `/api/chat/conversations/:id/messages` | Send a message |
| PATCH | `/api/chat/conversations/:id/read` | Mark as read |
| DELETE | `/api/chat/messages/:id/me` | Delete for me |
| DELETE | `/api/chat/messages/:id/everyone` | Delete for everyone |
| DELETE | `/api/chat/conversations/:id/me` | Hide a conversation |
| POST | `/api/chat/visitor/:visitId/conversation` | Visitor opens their thread |
| GET | `/api/chat/visitor/:visitId/conversations/:id/messages` | Visitor history |
| POST | `/api/chat/visitor/:visitId/conversations/:id/messages` | Visitor sends |
| PATCH | `/api/chat/visitor/:visitId/conversations/:id/read` | Visitor read state |

The visitor endpoints authenticate with the `visitorChatToken` issued on
approval, not a JWT — visitors have no account.

Socket events (single connection, both identities): `conversation:join`,
`conversation:leave`, `message:send`, `visitor:message:send`,
`conversation:read`, `message:delete:me`, `message:delete:everyone`,
`conversation:delete:me`, plus the outgoing `message:new`, `messages:read`,
`message:deleted`, `notification:new`.

### 4. Auth & Registration integration Endpoints

`backend/routes/authRoutes.js` + `backend/services/authService.js`.

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| POST | `/api/auth/register` | Register (role-aware, needs an occupied unit) |
| POST | `/api/auth/login` | Log in, returns the JWT |
| POST | `/api/auth/forgot-password` | Request a reset link |
| POST | `/api/auth/reset-password` | Complete the reset |
| GET | `/api/auth/me` | Current user |
| PATCH | `/api/auth/me` | Update profile |
| PATCH | `/api/auth/change-password` | Change password |

Edge cases handled in the service: admin accounts cannot self-register, a unit
can only be claimed by one resident, and a non-`ACTIVE` account cannot log in.

### 5. Backend Integration & Fixes

Work that spans modules rather than owning one:

- **`backend/utils/statusConstants.js`** — a single status vocabulary for the
  whole API, with the ticket transition table and shared predicates
  (`canTransitionTicket`, `isVisitChatAllowed`, `isTicketChatLocked`). This is
  what stopped each controller inventing its own `if (status !== ...)` guard.
- **Notification enum bug fix** — `INVOICE_PAID` and `INVOICE_PAYMENT_SUBMITTED`
  were emitted by the billing flow but missing from the `Notification` schema
  enum, so Mongoose rejected the write and the realtime push never fired. The
  invoice screens looked stale for that reason alone.
- **Realtime fan-out** — invoice and ticket notifications went only to the
  resident, so the admin who made a change (and any second admin watching) was
  never told. Added `notifyRole("ADMIN", …)` plus the assigned technician.
- **`backend/services/residentDashboardService.js`** — the "Paid" figure and the
  full invoice history in one call, so the dashboard and the invoices page
  cannot drift apart.
- **Test suite** — `npm test` runs 45 backend tests covering the state machines,
  the filters and the aggregation rules.

---

## Evidence — Frontend

### 1. Shared Frontend Infrastructure

`frontend/src/app/core/` — app-wide singletons, deliberately the **only** home
for shared logic (previously there were two copies of the notification and theme
services, and the dead one was still imported in places):

- `core/guards/auth-guard.ts` — role-aware guard, redirects to `/access-denied`
  rather than silently dumping a user on the wrong dashboard
- `core/interceptors/auth-interceptor.ts` — attaches the JWT
- `core/layout/authenticated-layout/` — the single app shell used by **every**
  dashboard, with the navigation map in `nav-items.ts`
- `core/services/chat-socket.ts` — the one Socket.IO client
- `core/utils/realtime-refresh.ts` — one-line realtime subscription for a screen
- `core/services/auth.service.ts` — the only reader/writer of credentials

### 2. OTP Verification Page

`frontend/src/app/Components/VisitorAccess/pages/public/otp-verification/`

Rebuilt against the existing backend flow — no demo logic, no hard-coded code.
The OTP always comes from the API and the visible outcome always mirrors the real
response.

Fixes on top of the previous implementation:

- **Paste** now fills all six boxes (it silently did nothing before)
- **Processing state** actually appears while the request is in flight (previously
  the phase was only entered *after* the reply, so a fast response skipped it)
- **Expiry countdown** driven by the backend's own `expiresAt`
- **Attempts warning** mirroring the backend's 5-attempt limit
- **Resend cooldown** so the button cannot be spammed
- **Arrow keys** move between boxes; multi-digit autofill is spread correctly
- Removed the component's own `cdr.detectChanges()` calls, which assert under this
  app's zoneless change detection

### 3. Invoice Receipt & Printing

`frontend/src/app/shared/invoice/` — one receipt for every role, so the printed
document is identical for Admin, Resident and Technician:

- `invoice.model.ts` — `describeInvoice()` normalises the different API shapes
  into a single view model
- `invoice-receipt.ts/.html/.css` — the printable receipt
- `invoice.model.spec.ts` — 15 tests locking the contract down

Print isolation lives in the global `@media print` block in
`frontend/src/styles.css`, scoped with `body:has(.invoice-print-area)`: it hides
the sidebar, topbar, filters and buttons and emits **only** the invoice. No popup
window and no `window.location.reload()` — both break in normal use.

---

## Verification

| Check | Result |
| ----- | ------ |
| Backend tests (`npm test`) | **45 / 45 pass** |
| Frontend tests (Vitest) | **88 / 88 pass** |
| Production build (`ng build`) | **succeeds** |

The realtime path was confirmed in a browser against the live API: changing an
invoice from outside the page flipped the exact table row (`PENDING → PAID`)
on its own, with the DOM node surviving (proving no reload), and the resident's
"Paid" total moved by exactly the mutated amount.