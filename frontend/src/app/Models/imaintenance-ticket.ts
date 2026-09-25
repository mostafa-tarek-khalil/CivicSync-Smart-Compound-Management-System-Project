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
  ticket: IMaintenanceTicket;

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
}

export interface ITicketActionResponse {
  message: string;
  ticket: IMaintenanceTicket;
}
