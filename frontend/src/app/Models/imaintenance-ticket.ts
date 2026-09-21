import { IUserSummary } from './iuser-summary';

export type TTicketCategory =
  | 'PLUMBING'
  | 'ELECTRICITY'
  | 'ELEVATOR'
  | 'AC'
  | 'GENERAL';

export type TTicketPriority =| 'LOW'| 'MEDIUM' | 'HIGH'| 'URGENT';

export type TTicketStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED';

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

  skippedBy: string[] | IUserSummary[];

  createdAt: string;

  updatedAt: string;
}

export interface ICreateTicketDto {
  title: string;

  category: TTicketCategory;

  description: string;

  attachmentUrl?: string | null;

  priority?: TTicketPriority;
}