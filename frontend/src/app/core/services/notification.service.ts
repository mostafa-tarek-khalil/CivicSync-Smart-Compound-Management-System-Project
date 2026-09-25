import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { NotificationType } from '../models/status';
import { environment } from '../../../environments/environment';

const API_URL = `${environment.apiUrl}/notifications`;

/**
 * Mirrors the single backend Notification model
 * (userId, type, title, message, relatedId, isRead, createdAt, updatedAt).
 * There is no second notification concept anywhere in the app.
 */
export interface NotificationItem {
  _id: string;
  userId: string;
  type: NotificationType | string;
  title: string;
  message: string;
  relatedId?: string | null;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  success: boolean;
  count: number;
  data: NotificationItem[];
}

/**
 * THE single notification service.
 *
 * Owns fetching, marking read/unread state, deleting, and the unread badge
 * count that the topbar/sidebar bind to. The unread count lives in a signal so
 * every shell shows the same number without polling independently.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly unreadSignal = signal(0);

  /** Reactive badge source, shared by the topbar, sidebar and toast stack. */
  readonly unreadCount = this.unreadSignal.asReadonly();

  constructor(private http: HttpClient) {}

  getNotifications(unreadOnly = false): Observable<NotificationsResponse> {
    const params = unreadOnly
      ? new HttpParams().set('unread', 'true')
      : undefined;

    return this.http
      .get<NotificationsResponse>(API_URL, { params })
      .pipe(
        tap(response => {
          if (unreadOnly) {
            this.unreadSignal.set(response.data?.length ?? 0);
          }
        })
      );
  }

  /** Re-reads the unread list and republishes the badge count. */
  refreshUnreadCount(): Observable<NotificationsResponse> {
    return this.getNotifications(true);
  }

  markAsRead(id: string): Observable<{ success: boolean; data: NotificationItem }> {
    return this.http
      .patch<{ success: boolean; data: NotificationItem }>(
        `${API_URL}/${id}/read`,
        {}
      )
      .pipe(
        tap(() => {
          this.unreadSignal.update(count => Math.max(0, count - 1));
        })
      );
  }

  markAllAsRead(): Observable<{ success: boolean; modifiedCount: number }> {
    return this.http
      .patch<{ success: boolean; modifiedCount: number }>(
        `${API_URL}/read-all`,
        {}
      )
      .pipe(tap(() => this.unreadSignal.set(0)));
  }

  deleteNotification(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${API_URL}/${id}`
    );
  }

  /** Called by the realtime listener when a `notification:new` event arrives. */
  incrementUnread(): void {
    this.unreadSignal.update(count => count + 1);
  }
}
