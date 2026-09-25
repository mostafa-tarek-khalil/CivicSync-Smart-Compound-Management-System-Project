/**
 * Shared invoice shape used by the receipt view and the print action.
 *
 * It is deliberately tolerant: the admin endpoint returns populated objects
 * (resident / unit / ticket), while the resident dashboard returns flat ids.
 * The receipt component normalises both through `describeInvoice` below, so a
 * single template serves every role.
 */

export type InvoiceStatus =
  | 'PENDING'
  | 'PAYMENT_SUBMITTED'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED';

export interface IInvoicePerson {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string | null;
}

export interface IInvoiceUnit {
  unitNumber?: number | string | null;
  floor?: number | null;
  type?: string | null;
  buildingId?:
  | { name?: string | null; buildingNumber?: number | string | null }
  | string
  | null;
}

export interface IInvoiceTicket {
  _id?: string;
  title?: string;
  category?: string | null;
  status?: string | null;
}

export interface IInvoiceDetail {
  _id: string;
  amount: number;
  status: InvoiceStatus | string;
  dueDate?: string | null;
  paidAt?: string | null;
  paymentSubmittedAt?: string | null;
  description?: string | null;
  createdAt?: string | null;
  residentId?: IInvoicePerson | string | null;
  unitId?: IInvoiceUnit | string | null;
  unit?: IInvoiceUnit | null;
  ticketId?: IInvoiceTicket | string | null;
  ticketTitle?: string | null;
  ticketCategory?: string | null;
}

/** `INV-1A2B3C`, derived from the Mongo id (the app's existing convention). */
export function invoiceNumber(invoice: Pick<IInvoiceDetail, '_id'>): string {
  return `INV-${String(invoice?._id || '').slice(-6).toUpperCase()}`;
}

/** Human label for the status badge. */
export function invoiceStatusLabel(status: string): string {
  switch (status) {
    case 'PAID':
      return 'Paid';
    case 'PAYMENT_SUBMITTED':
      return 'Awaiting approval';
    case 'OVERDUE':
      return 'Overdue';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return 'Payment due';
  }
}

/** CSS modifier class for the status badge. */
export function invoiceStatusClass(status: string): string {
  switch (status) {
    case 'PAID':
      return 'status-paid';
    case 'PAYMENT_SUBMITTED':
      return 'status-submitted';
    case 'OVERDUE':
      return 'status-overdue';
    case 'CANCELLED':
      return 'status-cancelled';
    default:
      return 'status-pending';
  }
}

export interface NormalisedInvoice {
  number: string;
  residentName: string;
  residentContact: string;
  unitLabel: string;
  description: string;
  ticketLabel: string;
  ticketId: string;
  amount: number;
  status: string;
  statusLabel: string;
  statusClass: string;
  issuedLabel: string;
  dueLabel: string;
  paidLabel: string;
  /** A settled invoice is the only one whose receipt reads as a payment proof. */
  isSettled: boolean;
  /** True for a maintenance-derived invoice (a ticket is attached). */
  isMaintenance: boolean;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

function formatDate(value?: string | null): string {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTHS[date.getMonth()];
  // Long-form, unambiguous, and locale-independent so a printed receipt reads
  // the same on every machine.
  return `${day} ${month} ${date.getFullYear()}`;
}

function personOf(invoice: IInvoiceDetail): IInvoicePerson | null {
  const resident = invoice.residentId;
  return resident && typeof resident === 'object' ? resident : null;
}

function unitOf(invoice: IInvoiceDetail): IInvoiceUnit | null {
  const unit =
    invoice.unit ||
    (invoice.unitId && typeof invoice.unitId === 'object' ? invoice.unitId : null);

  return unit || null;
}

/**
 * Flattens the several backend shapes into exactly what the receipt renders.
 * Keeping this in one place means the Admin, Resident and Technician views
 * cannot drift apart.
 */
export function describeInvoice(invoice: IInvoiceDetail): NormalisedInvoice {
  const person = personOf(invoice);
  const unit = unitOf(invoice);

  const building =
    unit?.buildingId && typeof unit.buildingId === 'object'
      ? unit.buildingId
      : null;

  const unitParts: string[] = [];

  if (building?.name) {
    unitParts.push(building.name);
  } else if (building?.buildingNumber != null) {
    unitParts.push(`Building ${building.buildingNumber}`);
  }

  if (unit?.unitNumber != null) {
    unitParts.push(`Unit ${unit.unitNumber}`);
  }

  if (unit?.floor != null) {
    unitParts.push(`Floor ${unit.floor}`);
  }

  const ticket =
    invoice.ticketId && typeof invoice.ticketId === 'object'
      ? invoice.ticketId
      : null;

  const ticketTitle = ticket?.title || invoice.ticketTitle || '';
  const ticketCategory = ticket?.category || invoice.ticketCategory || null;

  return {
    number: invoiceNumber(invoice),
    residentName: person?.name || '—',
    residentContact: [person?.email, person?.phone].filter(Boolean).join(' · '),
    unitLabel: unitParts.length ? unitParts.join(' · ') : '—',
    description:
      invoice.description ||
      (ticketTitle
        ? `Maintenance — ${ticketTitle}`
        : 'Compound service charges'),
    ticketLabel: ticketTitle
      ? ticketCategory
        ? `${ticketTitle} (${ticketCategory})`
        : ticketTitle
      : '—',
    ticketId: ticket?._id || (typeof invoice.ticketId === 'string' ? invoice.ticketId : ''),
    amount: Number(invoice.amount) || 0,
    status: invoice.status,
    statusLabel: invoiceStatusLabel(invoice.status),
    statusClass: invoiceStatusClass(invoice.status),
    issuedLabel: formatDate(invoice.createdAt),
    dueLabel: formatDate(invoice.dueDate),
    paidLabel: invoice.paidAt ? formatDate(invoice.paidAt) : '—',
    isSettled: invoice.status === 'PAID',
    isMaintenance: Boolean(ticketTitle)
  };
}

/** `6,000 EGP` — the app's existing money format. */
export function formatEgp(amount: number | null | undefined): string {
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(amount) || 0)} EGP`;
}