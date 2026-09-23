import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IMaintenanceTicket, ICreateTicketDto } from '../Models/imaintenance-ticket';

export interface ITicketsListResponse {
  count: number;
  tickets: IMaintenanceTicket[];
}

export interface ITicketDetailsResponse {
  ticket: IMaintenanceTicket;
}

export interface ITicketActionResponse {
  message: string;
  ticket: IMaintenanceTicket;
}

@Injectable({
  providedIn: 'root'
})
export class MaintenanceTicketService {
  private readonly apiUrl = '/api/resident';

  constructor(private http: HttpClient) {}

  getResidentTickets(): Observable<ITicketsListResponse> {
    return this.http.get<ITicketsListResponse>(
      `${this.apiUrl}/tickets`
    );
  }

  getTicketDetails(id: string): Observable<ITicketDetailsResponse> {
    return this.http.get<ITicketDetailsResponse>(
      `${this.apiUrl}/tickets/${id}`
    );
  }

  createTicket(ticket: ICreateTicketDto): Observable<ITicketActionResponse> {
    return this.http.post<ITicketActionResponse>(
      `${this.apiUrl}/tickets`,
      ticket
    );
  }

  closeTicket(id: string): Observable<ITicketActionResponse> {
    return this.http.patch<ITicketActionResponse>(
      `${this.apiUrl}/tickets/${id}/close`,
      {}
    );
  }
}