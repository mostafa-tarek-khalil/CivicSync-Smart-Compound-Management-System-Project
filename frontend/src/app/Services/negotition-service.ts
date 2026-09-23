import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  INegotiation,
  ICreateNegotiationDto
} from '../Models/inegotiation';

export interface INegotiationsResponse {
  count: number;
  negotiations: INegotiation[];
}

@Injectable({
  providedIn: 'root'
})
export class NegotiationService {
  private readonly apiUrl = '/api/resident';

  constructor(private http: HttpClient) {}

  getNegotiations(offerId: string): Observable<INegotiationsResponse> {
    return this.http.get<INegotiationsResponse>(
      `${this.apiUrl}/offers/${offerId}/negotiations`
    );
  }

  createNegotiation(
    offerId: string,
    negotiation: ICreateNegotiationDto
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/offers/${offerId}/negotiations`,
      negotiation
    );
  }
}