import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  IInvoiceDetail,
  NormalisedInvoice,
  describeInvoice,
  formatEgp
} from './invoice.model';

/**
 * The printable invoice receipt.
 *
 * One component serves Admin, Resident and Technician so the printed document
 * is identical for every role — only the surrounding page differs.
 *
 * Print isolation: the receipt is the only element marked with the
 * `invoice-print-area` class. The global print stylesheet (styles.css) hides
 * everything except that subtree, so `window.print()` emits the invoice alone
 * and never the sidebar, topbar or dashboard behind it. A popup window is NOT
 * used, so there is no popup-blocker dependency and no duplicated markup.
 */
@Component({
  selector: 'app-invoice-receipt',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invoice-receipt.html',
  styleUrl: './invoice-receipt.css'
})
export class InvoiceReceipt {
  /** Raw invoice as returned by the API (admin detail or dashboard row). */
  @Input({ required: true })
  set invoice(value: IInvoiceDetail) {
    this.view = describeInvoice(value);
  }

  /** The signed-in user's role, shown in the receipt footer ("Issued by"). */
  @Input() viewerRole = '';

  /** Hide the actions when the receipt is embedded read-only (e.g. a modal). */
  @Input() showActions = true;

  /** Emitted when the operator asks to navigate to the linked ticket. */
  @Output() openTicket = new EventEmitter<string>();

  view!: NormalisedInvoice;

  formatEgp = formatEgp;

  /**
   * Prints the receipt only.
   *
   * The browser print dialog is driven by the `@media print` rules in
   * styles.css, which collapse the page to `.invoice-print-area`. No
   * `window.location.reload()` and no DOM cloning.
   */
  print(): void {
    window.print();
  }

  goToTicket(): void {
    if (this.view?.ticketId) {
      this.openTicket.emit(this.view.ticketId);
    }
  }

  /**
   * Deterministic decorative bar widths for the reference strip.
   *
   * Derived from the invoice number so a given invoice always draws the same
   * pattern (a changing width between renders would look broken on a reprint).
   * It encodes nothing — the readable reference is printed underneath.
   */
  barcodeFor(number: string): number[] {
    const source = number || 'INV';
    const bars: number[] = [];

    for (let index = 0; index < source.length; index += 1) {
      const code = source.charCodeAt(index);
      // Two bars per character, alternating thin/thick, always 1-4px.
      bars.push((code % 4) + 1);
      bars.push(((code >> 2) % 4) + 1);
      bars.push(1);
    }

    return bars;
  }
}