# Manual probe scripts

These are **not** part of the automated suite (`npm test` only picks up
`backend/tests/*.test.js`). They are throwaway probes that were previously
scattered in the project root; they live here so the root stays clean while the
scripts keep working.

They talk to a **running** backend (`npm start`) over Socket.IO / HTTP, so run
them by hand only:

```bash
node backend/tests/manual/socket-test.js
```

| Script | What it does |
| ------ | ------------ |
| `socket-test.js` | Connects a resident socket, joins a conversation, echoes messages. |
| `socket-test-2.js` | Second-client variant of the same handshake. |
| `visitor-socket-test.js` | Connects the visitor socket with a `visitorChatToken`. |
| `resident-visitor-socket-test.js` | Resident side of a visitor conversation. |
| `visitor-token-test.js` | Fetches and validates a visitor chat token over REST. |
| `api-probe.js` | Hits every API route with a real token per role and prints the status table. |
| `verify-paid-card.js` | Builds a full billing fixture (paid / pending / overdue / submitted / cancelled) and asserts the resident "Paid" card sums **only** PAID invoices. Needs a database. |
| `verify-billing-math.js` | Offline twin of the above: runs the real billing constants with no database, so the Paid arithmetic can be checked anywhere. |
| `qa-account.js` | Creates / deletes a QA resident account for browser testing. |

> The hard-coded tokens / ids inside the socket files are from old local sessions
> and are expected to be expired — replace them with fresh ones before running.