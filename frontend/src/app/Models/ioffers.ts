import { IUserSummary } from './iuser-summary';

export type TOfferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

export interface ITechnicianInfo {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  rating?: number;
  completedJobsCount?: number;
  specialization?: string;
  specializations?: string[];
}

export interface IOffer {
  _id: string;
  ticketId: string;
  technicianId: string | ITechnicianInfo | IUserSummary;
  price: number;
  estimatedDuration: number;
  note?: string | null;
  status: TOfferStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface ICreateOfferDto {
  price: number;
  estimatedDuration: number;
  note?: string | null;
}

export interface IUpdateOfferDto {
  price?: number;
  estimatedDuration?: number;
  note?: string | null;
}

export interface IOffersResponse {
  status?: string;
  count?: number;
  results?: number;
  offers: IOffer[];
}

export interface IOfferActionResponse {
  message: string;
  offer: IOffer;
}