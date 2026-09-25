# pdfgen — standalone PDF tool

A small, **isolated** Node tool that owns the `pdfkit` dependency used for PDF
rendering (invoice / report exports).

It was previously a folder called `_pdfgen/` sitting in the project root with no
source file, no README and no link to the app. Nothing in `backend/` or
`frontend/` currently calls it, so it is kept here as a clearly separated
optional tool rather than being silently deleted.

## Why its own `package.json`

`pdfkit` pulls a large dependency tree (`fontkit`, `brotli`, `unicode-*`, …) that
the backend and the Angular app do not need. Keeping it in `tools/pdfgen`
with a private `package.json` means:

* the root `npm install` stays lean;
* `npm test` (root and frontend) can never be affected by it;
* the dependency is still installable when the PDF feature is picked up.

## Usage

```bash
cd tools/pdfgen
npm install
npm start          # runs node index.js
```

> `index.js` is the future entry point — add the rendering logic there, or require
> this folder from `backend/services/invoiceService.js` once PDF invoices ship.