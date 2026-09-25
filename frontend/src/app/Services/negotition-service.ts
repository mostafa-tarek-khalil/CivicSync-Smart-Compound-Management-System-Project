import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  INegotiation,
  ICreateNegotiationDto
} from '../Models/inegotiation';
import { environment } from '../../environments/environment';

export interface INegotiationsResponse {
  count: number;
  negotiations: INegotiation[];
}

@Injectable({
  providedIn: 'root'
})
export class NegotiationService {
  private readonly apiUrl = `${environment.apiUrl}/resident`;

  constructor(private http: HttpClient) {}

  getNegotiations(offerId: string): Observable<INegotiationsResponse> {
    return this.http.get<INegotiationsResponse>(
      `${this.apiUrl}/offers/${offerId}/negotiations`
    );
  }

  createNegotiation(
    offerId: string,
    negotiation: ICreateNegotiationDto
  ): Observable<{ message: string; negotiation: INegotiation }> {
    return this.http.post<{ message: string; negotiation: INegotiation }>(
      `${this.apiUrl}/offers/${offerId}/negotiations`,
      negotiation
    );
  }
}
