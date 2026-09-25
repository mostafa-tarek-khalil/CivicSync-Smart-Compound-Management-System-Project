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
import { INegotiationsResponse, ICreateNegotiationDto } from '../Models/inegotiation';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TechnicianService {
  private readonly baseUrl = `${environment.apiUrl}/technician`;

  constructor(private http: HttpClient) {}

  getAvailableTickets(): Observable<ITicketsResponse> {
    return this.http.get<ITicketsResponse>(`${this.baseUrl}/available-tickets`);
  }

  getAvailableTicketDetails(id: string): Observable<ITicketDetailsResponse> {
    return this.http.get<ITicketDetailsResponse>(
      `${this.baseUrl}/available-tickets/${id}`
    );
  }

  getAssignedTickets(): Observable<ITicketsResponse> {
    return this.http.get<ITicketsResponse>(`${this.baseUrl}/assigned-tickets`);
  }

  getAssignedTicketDetails(id: string): Observable<ITicketDetailsResponse> {
    return this.http.get<ITicketDetailsResponse>(`${this.baseUrl}/tickets/${id}`);
  }

  startTicket(id: string): Observable<ITicketActionResponse> {
    return this.http.patch<ITicketActionResponse>(
      `${this.baseUrl}/tickets/${id}/start`,
      {}
    );
  }

  resolveTicket(id: string): Observable<ITicketActionResponse> {
    return this.http.patch<ITicketActionResponse>(
      `${this.baseUrl}/tickets/${id}/resolve`,
      {}
    );
  }

  skipTicket(id: string): Observable<ITicketActionResponse> {
    return this.http.post<ITicketActionResponse>(
      `${this.baseUrl}/tickets/${id}/skip`,
      {}
    );
  }

  getMyOffers(): Observable<IOffersResponse> {
    return this.http.get<IOffersResponse>(`${this.baseUrl}/offers/my`);
  }

  createOffer(
    ticketId: string,
    dto: ICreateOfferDto
  ): Observable<IOfferActionResponse> {
    return this.http.post<IOfferActionResponse>(
      `${this.baseUrl}/tickets/${ticketId}/offers`,
      dto
    );
  }

  updateOffer(
    id: string,
    dto: IUpdateOfferDto
  ): Observable<IOfferActionResponse> {
    return this.http.patch<IOfferActionResponse>(
      `${this.baseUrl}/offers/${id}`,
      dto
    );
  }

  withdrawOffer(id: string): Observable<IOfferActionResponse> {
    return this.http.patch<IOfferActionResponse>(
      `${this.baseUrl}/offers/${id}/withdraw`,
      {}
    );
  }

  getTechnicianReviews(): Observable<IReviewsResponse> {
    return this.http.get<IReviewsResponse>(`${this.baseUrl}/reviews`);
  }

  getNegotiations(offerId: string): Observable<INegotiationsResponse> {
    return this.http.get<INegotiationsResponse>(
      `${this.baseUrl}/offers/${offerId}/negotiations`
    );
  }

  createNegotiation(
    offerId: string,
    dto: ICreateNegotiationDto
  ): Observable<{ message?: string; negotiation?: unknown }> {
    return this.http.post<{ message?: string; negotiation?: unknown }>(
      `${this.baseUrl}/offers/${offerId}/negotiations`,
      dto
    );
  }
}