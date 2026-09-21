import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {  Observable } from 'rxjs';

import { IMaintenanceTicket , ICreateTicketDto } from '../Models/imaintenance-ticket';

// واجهات شكل الرد القادم من الـ Backend
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

  // الرابط مباشر على بورت 3000
  private apiUrl = 'http://localhost:3000/resident';

  constructor(
    private http: HttpClient
  ) {}

  // 1. جلب كل التذاكر
  getResidentTickets(): Observable<ITicketsListResponse> {
    return this.http.get<ITicketsListResponse>(
      `${this.apiUrl}/tickets`
    );
  }

  // 2. جلب تفاصيل تذكرة محددة
  getTicketDetails(
    id: string
  ): Observable<ITicketDetailsResponse> {
    return this.http.get<ITicketDetailsResponse>(
      `${this.apiUrl}/tickets/${id}`
    );
  }

  // 3. إنشاء تذكرة جديدة
  createTicket(
    ticket: ICreateTicketDto
  ): Observable<ITicketActionResponse> {
    return this.http.post<ITicketActionResponse>(
      `${this.apiUrl}/tickets`,
      ticket
    );
  }

  // 4. إغلاق التذكرة
  closeTicket(
    id: string
  ): Observable<ITicketActionResponse> {
    return this.http.patch<ITicketActionResponse>(
      `${this.apiUrl}/tickets/${id}/close`,
      {}
    );
  }
}
