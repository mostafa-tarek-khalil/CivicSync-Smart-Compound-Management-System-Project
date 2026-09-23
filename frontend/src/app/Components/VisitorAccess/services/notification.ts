
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Notification {
  _id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedId?: string | null;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponse {
  success: boolean;
  count: number;
  data: Notification[];
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private readonly apiUrl = 'http://localhost:3000/api/notifications';

  constructor(private http: HttpClient) {}

  getNotifications(): Observable<NotificationResponse> {
    return this.http.get<NotificationResponse>(this.apiUrl);
  }

  getUnreadNotifications(): Observable<NotificationResponse> {
    return this.http.get<NotificationResponse>(
      this.apiUrl,
      { params: { unread: 'true' } }
    );
  }

  markAsRead(id: string): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/${id}/read`,
      {}
    );
  }

  markAllAsRead(): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/read-all`,
      {}
    );
  }

  deleteNotification(id: string): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/${id}`
    );
  }
}
