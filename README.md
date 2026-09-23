# CivicSync — Smart Compound Management System

Full-stack application: **Node/Express + MongoDB** backend with an **Angular** frontend.

## Project structure

```
CivicSync/
├── index.js                # Backend entry point (Express + Socket.IO)
├── package.json            # Root scripts (start / seed)
├── .env                    # Environment variables (DB_URI, JWT_SECRET, EMAIL_*)
├── backend/                # Backend source
│   ├── config/             # DB connection
│   ├── controllers/        # HTTP layer
│   ├── services/           # Business logic
│   ├── models/             # Mongoose schemas
│   ├── routes/             # Express routers
│   ├── middleware/         # auth + role guards
│   ├── socket/             # Socket.IO handlers
│   └── seed/               # adminSeed.js + demoSeed.js
└── frontend/               # Angular application (single, unified frontend)
    └── src/app/
        ├── Components/     # Login / register / landing / chat
        │   └── VisitorAccess/
        │       ├── layout/ # topbar
        │       ├── pages/  # visitor + security + resident screens
        │       └── services/ # visitor-flow, theme, notification, visit-status util
        ├── Services/       # auth-service, visit-service, notification-service
        ├── Guards/         # auth-guard (role aware)
        └── Interceptors/   # auth interceptor (JWT)
```

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

## Visitor access flow (end to end)

1. **Visitor request** — a visitor submits a request (`/visitor-request`) by picking an occupied unit, date, and time.
2. **Email OTP** — an OTP is emailed; the visitor verifies it (`/otp-verification`).
3. **Resident decision** — the resident reviews the request (`/resident-visitor-requests`) and approves or rejects.
   - On **approve**, the backend immediately issues the QR pass (`QR_GENERATED`) and a visitor chat token.
4. **Status + QR** — the visitor tracks progress (`/visitor-request-status`) and shows the QR pass (`/qr-code-display`), a real QR image rendered from the backend `qrToken`.
5. **Security scan** — security opens the real camera scanner (`/qr-scanner`). The code is decoded in the browser (jsQR) and verified against the backend (`POST /api/visits/scan`).
6. **Check-in / check-out** — security confirms entry/exit (`/check-in-out`), which calls the backend state machine.

Resident-invite flow (a resident inviting a visitor directly) runs through the same state machine, with the OTP/QR issued on approval.

## Scripts

| Location | Command             | Description                       |
| -------- | ------------------- | --------------------------------- |
| root     | `npm start`         | Run the backend                   |
| root     | `npm run dev`       | Run the backend with watch        |
| root     | `npm run seed:admin`| Seed the admin account            |
| root     | `npm run seed:demo` | Seed demo compound data           |
| frontend | `npm start`         | Angular dev server                |
| frontend | `npm run build`     | Production build                  |
| frontend | `npm test`          | Unit tests (Vitest)               |