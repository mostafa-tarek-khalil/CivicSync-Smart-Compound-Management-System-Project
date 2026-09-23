import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface NotificationItem {
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

interface NotificationsResponse {
  success: boolean;
  count: number;
  data: NotificationItem[];
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly apiUrl = 'http://localhost:3000/api/notifications';

  constructor(private http: HttpClient) {}

  getNotifications(unreadOnly = false): Observable<NotificationsResponse> {
    const params = unreadOnly
      ? new HttpParams().set('unread', 'true')
      : undefined;

    return this.http.get<NotificationsResponse>(this.apiUrl, { params });
  }

  markAsRead(id: string): Observable<{ success: boolean; data: NotificationItem }> {
    return this.http.patch<{ success: boolean; data: NotificationItem }>(
      `${this.apiUrl}/${id}/read`,
      {}
    );
  }

  markAllAsRead(): Observable<{ success: boolean; modifiedCount: number }> {
    return this.http.patch<{ success: boolean; modifiedCount: number }>(
      `${this.apiUrl}/read-all`,
      {}
    );
  }

  deleteNotification(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/${id}`
    );
  }
}
