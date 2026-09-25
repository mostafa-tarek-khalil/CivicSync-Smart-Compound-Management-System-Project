import { describe, expect, it } from 'vitest';

import {
  describeInvoice,
  formatEgp,
  invoiceNumber,
  invoiceStatusClass,
  invoiceStatusLabel,
  IInvoiceDetail
} from './invoice.model';

/**
 * These lock down the shared invoice contract used by the receipt component.
 * The Admin, Resident and Technician screens all render through
 * `describeInvoice`, so a regression here would be visible on every role.
 */
describe('invoice.model', () => {
  const baseInvoice: IInvoiceDetail = {
    _id: '65f1a2b3c4d5e6f701020304',
    amount: 6000,
    status: 'PAID',
    dueDate: '2026-02-01T00:00:00.000Z',
    paidAt: '2026-01-20T00:00:00.000Z',
    createdAt: '2026-01-05T00:00:00.000Z'
  };

  describe('invoiceNumber', () => {
    it('derives INV-<last 6 uppercase> from the id', () => {
      expect(invoiceNumber({ _id: '65f1a2b3c4d5e6f701020304' })).toBe(
        'INV-020304'
      );
    });

    it('does not throw on a missing id', () => {
      expect(invoiceNumber({ _id: '' })).toBe('INV-');
    });
  });

  describe('status labels', () => {
    it('maps every invoice status to a human label', () => {
      expect(invoiceStatusLabel('PAID')).toBe('Paid');
      expect(invoiceStatusLabel('PAYMENT_SUBMITTED')).toBe('Awaiting approval');
      expect(invoiceStatusLabel('OVERDUE')).toBe('Overdue');
      expect(invoiceStatusLabel('CANCELLED')).toBe('Cancelled');
      expect(invoiceStatusLabel('PENDING')).toBe('Payment due');
    });

    it('falls back to "Payment due" for an unknown status', () => {
      expect(invoiceStatusLabel('SOMETHING_NEW')).toBe('Payment due');
    });

    it('maps statuses to badge classes', () => {
      expect(invoiceStatusClass('PAID')).toBe('status-paid');
      expect(invoiceStatusClass('PAYMENT_SUBMITTED')).toBe('status-submitted');
      expect(invoiceStatusClass('OVERDUE')).toBe('status-overdue');
      expect(invoiceStatusClass('CANCELLED')).toBe('status-cancelled');
      expect(invoiceStatusClass('PENDING')).toBe('status-pending');
    });
  });

  describe('formatEgp', () => {
    it('formats with two decimals and the EGP suffix', () => {
      expect(formatEgp(6000)).toBe('6,000.00 EGP');
      expect(formatEgp(1234.5)).toBe('1,234.50 EGP');
    });

    it('treats null / undefined / NaN as zero', () => {
      expect(formatEgp(null)).toBe('0.00 EGP');
      expect(formatEgp(undefined)).toBe('0.00 EGP');
      expect(formatEgp(Number.NaN)).toBe('0.00 EGP');
    });
  });

  describe('describeInvoice', () => {
    it('classifies a ticket-linked invoice as maintenance', () => {
      const view = describeInvoice({
        ...baseInvoice,
        ticketId: { _id: 'ticket1', title: 'Leaking tap', category: 'PLUMBING' }
      });

      expect(view.isMaintenance).toBe(true);
      expect(view.ticketLabel).toBe('Leaking tap (PLUMBING)');
      expect(view.ticketId).toBe('ticket1');
    });

    it('classifies an invoice without a ticket as a regular charge', () => {
      const view = describeInvoice({
        ...baseInvoice,
        description: 'Quarterly service charge'
      });

      expect(view.isMaintenance).toBe(false);
      expect(view.ticketLabel).toBe('—');
      expect(view.description).toBe('Quarterly service charge');
    });

    it('falls back to a maintenance description when none is stored', () => {
      const view = describeInvoice({
        ...baseInvoice,
        description: null,
        ticketId: { title: 'Broken elevator' }
      });

      expect(view.description).toBe('Maintenance — Broken elevator');
    });

    it('builds the unit label from a populated unit', () => {
      const view = describeInvoice({
        ...baseInvoice,
        unit: {
          unitNumber: 12,
          floor: 3,
          buildingId: { name: 'Palm Tower', buildingNumber: 4 }
        }
      });

      expect(view.unitLabel).toBe('Palm Tower · Unit 12 · Floor 3');
    });

    it('reads the unit from unitId when unit is absent', () => {
      const view = describeInvoice({
        ...baseInvoice,
        unitId: { unitNumber: 7, floor: 1, buildingId: { buildingNumber: 9 } }
      });

      expect(view.unitLabel).toBe('Building 9 · Unit 7 · Floor 1');
    });

    it('shows a dash when the unit is entirely unknown', () => {
      expect(describeInvoice(baseInvoice).unitLabel).toBe('—');
    });

    it('marks only a PAID invoice as settled', () => {
      expect(describeInvoice({ ...baseInvoice, status: 'PAID' }).isSettled).toBe(
        true
      );
      expect(
        describeInvoice({ ...baseInvoice, status: 'PAYMENT_SUBMITTED' })
          .isSettled
      ).toBe(false);
      expect(
        describeInvoice({ ...baseInvoice, status: 'PENDING' }).isSettled
      ).toBe(false);
      expect(
        describeInvoice({ ...baseInvoice, status: 'CANCELLED' }).isSettled
      ).toBe(false);
    });

    it('reads the resident from a populated residentId', () => {
      const view = describeInvoice({
        ...baseInvoice,
        residentId: {
          name: 'Mona Ali',
          email: 'mona@compound.com',
          phone: '01000000000'
        }
      });

      expect(view.residentName).toBe('Mona Ali');
      expect(view.residentContact).toBe('mona@compound.com · 01000000000');
    });

    it('degrades gracefully when residentId is a bare id string', () => {
      const view = describeInvoice({ ...baseInvoice, residentId: 'abc123' });

      expect(view.residentName).toBe('—');
      expect(view.residentContact).toBe('');
    });

    it('formats the three key dates', () => {
      const view = describeInvoice(baseInvoice);

      expect(view.issuedLabel).toBe('05 Jan 2026');
      expect(view.dueLabel).toBe('01 Feb 2026');
      expect(view.paidLabel).toBe('20 Jan 2026');
    });

    it('shows a dash for a payment date that has not happened yet', () => {
      expect(describeInvoice({ ...baseInvoice, paidAt: null }).paidLabel).toBe(
        '—'
      );
    });

    it('coerces a string amount to a number', () => {
      const view = describeInvoice({
        ...baseInvoice,
        amount: '1500' as unknown as number
      });

      expect(view.amount).toBe(1500);
    });
  });
});