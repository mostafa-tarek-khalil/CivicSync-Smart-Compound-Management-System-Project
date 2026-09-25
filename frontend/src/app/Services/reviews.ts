import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ICreateReviewDto,
  IUpdateReviewDto,
  IReviewActionResponse,
} from '../Models/ireviews';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ReviewService {
  private readonly baseUrl = `${environment.apiUrl}/resident`;

  constructor(private http: HttpClient) {}

  createReview(
    ticketId: string,
    dto: ICreateReviewDto
  ): Observable<IReviewActionResponse> {
    return this.http.post<IReviewActionResponse>(
      `${this.baseUrl}/tickets/${ticketId}/review`,
      dto
    );
  }

  updateReview(
    id: string,
    dto: IUpdateReviewDto
  ): Observable<IReviewActionResponse> {
    return this.http.patch<IReviewActionResponse>(
      `${this.baseUrl}/reviews/${id}`,
      dto
    );
  }

  deleteReview(id: string): Observable<IReviewActionResponse> {
    return this.http.delete<IReviewActionResponse>(
      `${this.baseUrl}/reviews/${id}`
    );
  }
}