/**
 * Print helpers built on the browser's own print pipeline.
 *
 * These deliberately do NOT open a popup window and do NOT reload the page.
 * Both of those approaches break in normal use: popups are blocked by default
 * in most browsers, and `window.location.reload()` destroys the SPA state.
 *
 * Instead the app marks the printable subtree with a class and the global
 * `@media print` rules in `src/styles.css` collapse the page to just that
 * subtree. The rules are scoped with `body:has(<marker>)`, so printing any
 * unmarked screen keeps its default behaviour.
 */

/** Class that marks "when this is on screen, print only this". */
export const PRINT_AREA_CLASS = 'invoice-print-area';

/** Class for a subtree that must be hidden from the printout. */
export const NO_PRINT_CLASS = 'no-print';

/**
 * Hides everything except `selector` for the duration of one print, then
 * restores the page exactly as it was.
 *
 * This is the fallback for content that is not a `.invoice-print-area`
 * (e.g. a technician work order). It photographs nothing and clones nothing —
 * it only toggles a `display` override for the length of the print dialog.
 */
export function printElement(selector: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  const target = document.querySelector(selector);

  if (!target) {
    // Nothing to print: fall back to the browser's default behaviour rather
    // than silently doing nothing.
    window.print();
    return;
  }

  // `hidden-print-host` carries the override rules declared in styles.css.
  document.body.classList.add('printing-element');
  target.classList.add('print-target');

  const cleanup = () => {
    document.body.classList.remove('printing-element');
    target.classList.remove('print-target');
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);

  try {
    window.print();
  } finally {
    // `afterprint` is not fired by every browser (e.g. some Safari versions),
    // so the cleanup is also time-boxed by the promise-like timeout below.
    setTimeout(cleanup, 1000);
  }
}

/**
 * Prints the invoice receipt currently on screen.
 *
 * Kept as a named helper so every role's screen shares one behaviour.
 */
export function printInvoice(): void {
  window.print();
}