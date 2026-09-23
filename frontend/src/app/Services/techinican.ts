import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ITicketsResponse,
  ITicketDetailsResponse,
  ITicketActionResponse,
} from '../Models/imaintenance-ticket';
import {
  IOffersResponse,
  ICreateOfferDto,
  IUpdateOfferDto,
  IOfferActionResponse,
} from '../Models/ioffers';
import { IReviewsResponse } from '../Models/ireviews';

@Injectable({
  providedIn: 'root',
})
export class TechnicianService {
  private readonly baseUrl = '/api/technician';

  constructor(private http: HttpClient) {}

  getAvailableTickets(): Observable<ITicketsResponse> {
    return this.http.get<ITicketsResponse>(`${this.baseUrl}/available-tickets`);
  }

  getAvailableTicketDetails(id: string): Observable<ITicketDetailsResponse> {
    return this.http.get<ITicketDetailsResponse>(`${this.baseUrl}/available-tickets/${id}`);
  }

  getAssignedTickets(): Observable<ITicketsResponse> {
    return this.http.get<ITicketsResponse>(`${this.baseUrl}/assigned-tickets`);
  }

  getAssignedTicketDetails(id: string): Observable<ITicketDetailsResponse> {
    return this.http.get<ITicketDetailsResponse>(`${this.baseUrl}/ticket/${id}`);
  }

  startTicket(id: string): Observable<ITicketActionResponse> {
    return this.http.patch<ITicketActionResponse>(
      `${this.baseUrl}/ticket/${id}/start`,
      {}
    );
  }

  resolveTicket(id: string): Observable<ITicketActionResponse> {
    return this.http.patch<ITicketActionResponse>(
      `${this.baseUrl}/ticket/${id}/resolve`,
      {}
    );
  }

  skipTicket(id: string): Observable<ITicketActionResponse> {
    return this.http.post<ITicketActionResponse>(
      `${this.baseUrl}/ticket/${id}/skip`,
      {}
    );
  }

  getMyOffers(): Observable<IOffersResponse> {
    return this.http.get<IOffersResponse>(`${this.baseUrl}/offer/myoffers`);
  }

  createOffer(
    ticketId: string,
    dto: ICreateOfferDto
  ): Observable<IOfferActionResponse> {
    return this.http.post<IOfferActionResponse>(
      `${this.baseUrl}/ticket/${ticketId}/offer`,
      dto
    );
  }

  updateOffer(
    id: string,
    dto: IUpdateOfferDto
  ): Observable<IOfferActionResponse> {
    return this.http.patch<IOfferActionResponse>(
      `${this.baseUrl}/offer/${id}`,
      dto
    );
  }

  withdrawOffer(id: string): Observable<IOfferActionResponse> {
    return this.http.patch<IOfferActionResponse>(
      `${this.baseUrl}/offer/${id}/withdraw`,
      {}
    );
  }

  getTechnicianReviews(): Observable<IReviewsResponse> {
    return this.http.get<IReviewsResponse>(`${this.baseUrl}/reviews`);
  }
}