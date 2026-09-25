import { IMaintenanceTicket } from './imaintenance-ticket';

/** Maintenance counters returned by GET /api/resident/dashboard. */
export interface IDashboardTicketStats {
  total: number;
  open: number;
  assigned: number;
  inProgress: number;
  resolved: number;
  closed: number;
  completed: number;
}

export interface IDashboardInvoice {
  _id: string;
  amount: number;
  status:
    | 'PENDING'
    | 'PAYMENT_SUBMITTED'
    | 'PAID'
    | 'OVERDUE'
    | 'CANCELLED';
  dueDate: string;
  issueDate: string;
  paidAt: string | null;
  description?: string | null;
  ticketTitle: string | null;
}

/** Full invoice row returned in the billing history list. */
export interface IResidentInvoice extends IDashboardInvoice {
  ticketId: string | null;
  ticketCategory: string | null;
  /**
   * Populated unit (building + number + floor) so the resident receipt can
   * render the same location block as the admin one.
   */
  unitId?:
    | {
        unitNumber?: number | string | null;
        floor?: number | null;
        type?: string | null;
        buildingId?:
          | { name?: string | null; buildingNumber?: number | string | null }
          | string
          | null;
      }
    | string
    | null;
}

export interface IDashboardBilling {
  /**
   * What the resident still owes:
   * unpaid invoices + agreed maintenance cost not invoiced yet.
   */
  outstandingBalance: number;
  invoicesDue: number;
  maintenanceDue: number;
  /** Everything the resident has actually settled (PAID invoices). */
  paidBalance: number;
  /**
   * The part of `paidBalance` that settled maintenance jobs, and the part that
   * settled compound invoices. These two always add up to `paidBalance`.
   */
  paidMaintenance: number;
  paidInvoicesTotal: number;
  unpaidInvoicesCount: number;
  uninvoicedMaintenanceCount: number;
  /**
   * Finished (CLOSED) maintenance jobs whose invoice has not been raised yet.
   * The agreed price of these is owed as soon as the ticket closes, so the
   * dashboard can show it without waiting for the admin to invoice.
   */
  closedMaintenanceValue: number;
  closedMaintenanceCount: number;
  latestInvoice: IDashboardInvoice | null;
  /** Full billing history for the resident invoices screen. */
  invoices: IResidentInvoice[];
}

export interface IDashboardVisitor {
  _id: string;
  visitorName: string;
  visitDate: string;
  visitStartTime: string;
  status: string;
  source: 'RESIDENT_INVITE' | 'VISITOR_REQUEST';
  purpose?: string | null;
  createdAt?: string;
}

export interface IDashboardVisitors {
  thisMonth: number;
  pendingRequests: number;
  recent: IDashboardVisitor[];
}

export interface IResidentDashboard {
  tickets: IDashboardTicketStats;
  recentTickets: (IMaintenanceTicket & { price: number | null })[];
  billing: IDashboardBilling;
  visitors: IDashboardVisitors;
}
