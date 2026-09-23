import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ICreateReviewDto,
  IUpdateReviewDto,
  IReviewsResponse,
  IReviewActionResponse,
} from '../Models/ireviews';

@Injectable({
  providedIn: 'root',
})
export class ReviewService {
  private readonly baseUrl = '/api/reviews';

  constructor(private http: HttpClient) {}

  createReview(
    ticketId: string,
    dto: ICreateReviewDto
  ): Observable<IReviewActionResponse> {
    return this.http.post<IReviewActionResponse>(
      `${this.baseUrl}/${ticketId}`,
      dto
    );
  }

  updateReview(
    id: string,
    dto: IUpdateReviewDto
  ): Observable<IReviewActionResponse> {
    return this.http.patch<IReviewActionResponse>(
      `${this.baseUrl}/${id}`,
      dto
    );
  }

  deleteReview(id: string): Observable<IReviewActionResponse> {
    return this.http.delete<IReviewActionResponse>(`${this.baseUrl}/${id}`);
  }

  getTechnicianReviews(technicianId: string): Observable<IReviewsResponse> {
    return this.http.get<IReviewsResponse>(
      `${this.baseUrl}/technician/${technicianId}`
    );
  }
}