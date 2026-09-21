import { IUserSummary } from './iuser-summary';

export interface IReview {
  _id: string;

  ticketId: string;

  residentId: string | IUserSummary;

  technicianId: string | IUserSummary;

  rating: number;

  comment: string | null;

  createdAt: string;

  updatedAt: string;
}

export interface ICreateReviewDto {
  rating: number;

  comment?: string | null;
}

export interface IUpdateReviewDto {
  rating?: number;

  comment?: string | null;
}