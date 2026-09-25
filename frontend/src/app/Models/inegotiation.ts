import { IUserSummary } from './iuser-summary';

export type TSenderRole = 'RESIDENT' | 'TECHNICIAN';

export interface INegotiation {
  _id: string;
  offerId: string;
  senderId: string | IUserSummary;
  senderRole: TSenderRole;
  price: number;
  message: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateNegotiationDto {
  price: number;
  message?: string | null;
}

export interface INegotiationsResponse {
  count?: number;
  negotiations: INegotiation[];
}