import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { IOffersResponse } from '../Models/ioffers';

@Injectable({
  providedIn: 'root'
})
export class OfferService {

  private apiUrl = 'http://localhost:3000/resident';

  constructor(private http: HttpClient) {}

  getTicketOffers(ticketId: string): Observable<IOffersResponse> {

    return this.http.get<IOffersResponse>(
      `${this.apiUrl}/tickets/${ticketId}/offers`
    );

  }

  acceptOffer(offerId: string): Observable<any> {

    return this.http.patch(
      `${this.apiUrl}/offers/${offerId}/accept`,
      {}
    );

  }

}