import { IUserSummary } from './iuser-summary';
import { IOffer } from './ioffers';
import { IInvoiceDetail } from '../shared/invoice/invoice.model';

export type TTicketCategory =
  | 'PLUMBING'
  | 'ELECTRICITY'
  | 'ELEVATOR'
  | 'AC'
  | 'GENERAL';

export type TTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TTicketStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED';

export interface ITicketLocation {
  unitId: string;
  unitNumber: number;
  floor: number;
  type: string;
  status: string;
  buildingId: string;
  buildingName: string | null;
  buildingNumber: number | null;
}

export interface IMaintenanceTicket {
  _id: string;
  residentId: string | IUserSummary;
  title: string;
  category: TTicketCategory;
  description: string;
  attachmentUrl: string | null;
  priority: TTicketPriority;
  status: TTicketStatus;
  assignedTo: string | IUserSummary | null;
  resolvedAt?: string | null;
  skippedBy: string[] | IUserSummary[];
  createdAt: string;
  updatedAt: string;
  /**
   * Building / unit the resident lives in. Populated by the technician
   * endpoints so a technician standing on a job knows exactly where to go.
   * Absent on endpoints that do not resolve it.
   */
  location?: ITicketLocation | null;
}

export interface ICreateTicketDto {
  title: string;
  category: TTicketCategory;
  description: string;
  attachmentUrl?: string | null;
  priority?: TTicketPriority;
}

export interface ITicketsResponse {
  count?: number;
  tickets: IMaintenanceTicket[];
}

export interface ITicketDetailsResponse {
  /**
   * The ticket itself.
   *
   * Returned inside the `ticket` key by the resident and available-request
   * endpoints. The technician's assigned-job endpoint builds its payload with
   * `{ ...ticket, invoice }` instead, so the ticket's own fields arrive at the
   * TOP LEVEL (`_id`, `title`, `status`, ...) and this key is absent. Both
   * shapes are accepted here, and every reader must go through
   * `normalizeTicketDetails()` rather than reading `.ticket` directly.
   */
  ticket?: IMaintenanceTicket;

  /** Only returned by the technician available-ticket details endpoint. */
  existingOffer?: IOffer | null;

  /**
   * Invoice raised for this job, when there is one. Returned by the assigned
   * endpoint so the technician can print the same receipt the admin and
   * resident see. Null until an admin bills the closed ticket.
   */
  invoice?: IInvoiceDetail | null;

  /** Resident contact + unit location, returned by both detail endpoints. */
  location?: unknown;

  /**
   * The assigned endpoint's flattened shape, declared so callers are not lying
   * to the type checker when they read it. Every one of these is optional
   * because the enveloped shape has none of them.
   */
  _id?: string;
  title?: string;
  category?: TTicketCategory;
  description?: string;
  attachmentUrl?: string | null;
  priority?: TTicketPriority;
  status?: TTicketStatus;
  residentId?: string | IUserSummary | null;
  assignedTo?: string | IUserSummary | null;
  skippedBy?: string[] | IUserSummary[];
  locationDetail?: ITicketLocation | null;
  createdAt?: string;
  updatedAt?: string;

  /** Present when the response carried no ticket at all. */
  message?: string;
}

/**
 * Reduce either detail-response shape to the ticket, or null.
 *
 * The two technician endpoints genuinely disagree — one nests the ticket under
 * `ticket`, the other spreads it at the top level — and a caller that assumes
 * one gets `undefined` from the other. That single assumption is what made
 * every assigned-job "Details" click show an empty screen while the endpoint
 * was in fact answering 200 with a perfectly good ticket.
 */
export function normalizeTicketDetails(
  response: ITicketDetailsResponse | null | undefined
): IMaintenanceTicket | null {
  if (!response) {
    return null;
  }

  if (response.ticket) {
    return response.ticket;
  }

  // Flattened shape: the ticket's fields ARE the response body.
  if (response._id && response.title) {
    return response as unknown as IMaintenanceTicket;
  }

  return null;
}

export interface ITicketActionResponse {
  message: string;
  ticket: IMaintenanceTicket;
}
