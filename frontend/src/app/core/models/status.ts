/**
 * SINGLE STATUS CONTRACT (frontend side).
 *
 * Every value here mirrors the Mongoose `enum` in the corresponding backend
 * model 1:1 (see backend/utils/statusConstants.js). The UI must never invent
 * a status of its own — add it here AND in the backend model, or don't add it
 * at all.
 */

export enum UserRole {
  RESIDENT = 'RESIDENT',
  TECHNICIAN = 'TECHNICIAN',
  SECURITY = 'SECURITY',
  ADMIN = 'ADMIN'
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  REJECTED = 'REJECTED'
}

export enum TicketStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum TicketCategory {
  PLUMBING = 'PLUMBING',
  ELECTRICITY = 'ELECTRICITY',
  ELEVATOR = 'ELEVATOR',
  AC = 'AC',
  GENERAL = 'GENERAL'
}

export enum OfferStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN'
}

export enum VisitStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  QR_GENERATED = 'QR_GENERATED',
  QR_SCANNED = 'QR_SCANNED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  EXPIRED = 'EXPIRED'
}

export enum InvoiceStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED'
}

export enum NotificationType {
  VISITOR_REQUEST = 'VISITOR_REQUEST',
  VISITOR_APPROVED = 'VISITOR_APPROVED',
  VISITOR_REJECTED = 'VISITOR_REJECTED',
  VISITOR_CHECKED_IN = 'VISITOR_CHECKED_IN',
  VISITOR_CHECKED_OUT = 'VISITOR_CHECKED_OUT',
  MAINTENANCE_CREATED = 'MAINTENANCE_CREATED',
  NEW_OFFER = 'NEW_OFFER',
  NEW_NEGOTIATION = 'NEW_NEGOTIATION',
  OFFER_ACCEPTED = 'OFFER_ACCEPTED',
  OFFER_REJECTED = 'OFFER_REJECTED',
  TICKET_ASSIGNED = 'TICKET_ASSIGNED',
  TICKET_STATUS_CHANGED = 'TICKET_STATUS_CHANGED',
  NEW_MESSAGE = 'NEW_MESSAGE',
  ACCOUNT_APPROVED = 'ACCOUNT_APPROVED',
  ACCOUNT_REJECTED = 'ACCOUNT_REJECTED',
  INVOICE_CREATED = 'INVOICE_CREATED',
  INVOICE_DUE = 'INVOICE_DUE',
  // Must mirror the backend Notification enum exactly — these two drive the
  // realtime refresh of the invoice screens.
  INVOICE_PAID = 'INVOICE_PAID',
  INVOICE_PAYMENT_SUBMITTED = 'INVOICE_PAYMENT_SUBMITTED',
  INVOICE_UPDATED = 'INVOICE_UPDATED'
}

// ---------------------------------------------------------------------------
// Output-variable → CSS class helpers (used for status pills across the app)
// ---------------------------------------------------------------------------

const STATUS_SLUGS: Record<string, string> = {
  [TicketStatus.OPEN]: 'open',
  [TicketStatus.ASSIGNED]: 'assigned',
  [TicketStatus.IN_PROGRESS]: 'in-progress',
  [TicketStatus.RESOLVED]: 'resolved',
  [TicketStatus.CLOSED]: 'closed',
  [OfferStatus.ACCEPTED]: 'accepted',
  [OfferStatus.WITHDRAWN]: 'withdrawn',
  [VisitStatus.QR_GENERATED]: 'qr-generated',
  [VisitStatus.QR_SCANNED]: 'qr-scanned',
  [VisitStatus.CHECKED_IN]: 'checked-in',
  [VisitStatus.CHECKED_OUT]: 'checked-out',
  [VisitStatus.EXPIRED]: 'expired',
  [InvoiceStatus.PAID]: 'paid',
  [InvoiceStatus.OVERDUE]: 'overdue',
  [InvoiceStatus.CANCELLED]: 'cancelled'
};

/**
 * Shared slug values (`PENDING`, `REJECTED` …) appear in several enums with the
 * same spelling, so they are declared once here instead of once per enum — a
 * duplicate literal key in an object is a compile error in TypeScript.
 */
const SHARED_STATUS_SLUGS: Record<string, string> = {
  PENDING: 'pending',
  REJECTED: 'rejected',
  APPROVED: 'approved'
};

/** `IN_PROGRESS` -> `in-progress` (safe CSS-class fragment for any status). */
export function statusSlug(status?: string | null): string {
  if (!status) {
    return 'unknown';
  }

  return STATUS_SLUGS[status] ?? SHARED_STATUS_SLUGS[status] ?? status.toLowerCase().replace(/_/g, '-');
}

/** `IN_PROGRESS` -> `In Progress` */
export function statusLabel(status?: string | null): string {
  if (!status) {
    return 'Unknown';
  }

  return status
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * The maintenance state machine, mirrored from
 * backend/utils/statusConstants.js.
 */
export const TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.OPEN]: [TicketStatus.ASSIGNED],
  [TicketStatus.ASSIGNED]: [TicketStatus.IN_PROGRESS, TicketStatus.OPEN],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.RESOLVED],
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED],
  [TicketStatus.CLOSED]: []
};

export function canTransitionTicket(
  from: TicketStatus,
  to: TicketStatus
): boolean {
  return (TICKET_TRANSITIONS[from] ?? []).includes(to);
}

/** Statuses for which a visitor chat conversation stays open. */
export const VISIT_CHAT_ALLOWED_STATUSES: VisitStatus[] = [
  VisitStatus.APPROVED,
  VisitStatus.QR_GENERATED,
  VisitStatus.QR_SCANNED,
  VisitStatus.CHECKED_IN
];

export function isVisitChatOpen(status?: string | null): boolean {
  return VISIT_CHAT_ALLOWED_STATUSES.includes(status as VisitStatus);
}

/** Where each role belongs after login / on an access-denied redirect. */
export const ROLE_HOME: Record<UserRole, string> = {
  [UserRole.RESIDENT]: '/resident/dashboard',
  [UserRole.TECHNICIAN]: '/technician/dashboard',
  [UserRole.SECURITY]: '/security/visitors',
  [UserRole.ADMIN]: '/admin/dashboard'
};

export const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.RESIDENT]: 'Resident',
  [UserRole.TECHNICIAN]: 'Technician',
  [UserRole.SECURITY]: 'Security',
  [UserRole.ADMIN]: 'Administrator'
};

export function roleHome(role?: string | null): string {
  return ROLE_HOME[role as UserRole] ?? '/';
}
