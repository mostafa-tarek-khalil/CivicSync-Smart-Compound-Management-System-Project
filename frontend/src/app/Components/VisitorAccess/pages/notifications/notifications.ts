
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  NotificationService,
  Notification as ApiNotification
} from '../../services/notification';

interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  icon: string;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css'
})
export class Notifications implements OnInit {

  activeFilter: 'all' | 'unread' = 'all';

  notificationsList: AppNotification[] = [];

  constructor(
    private notificationService: NotificationService,
    private router: Router,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  goBack(): void {
    const role = localStorage.getItem('user');
    let target = '/';
    try {
      const parsed = role ? JSON.parse(role) : null;
      if (parsed?.role === 'SECURITY') target = '/security-dashboard';
      else if (parsed?.role === 'RESIDENT') target = '/chat';
      else if (parsed?.role === 'TECHNICIAN') target = '/technician';
    } catch {
      target = '/';
    }
    this.router.navigate([target]);
  }

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.notificationService.getNotifications().subscribe({
      next: (response) => {

        this.notificationsList = response.data.map(
          (notification: ApiNotification) => ({
            id: notification._id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            time: this.formatTime(notification.createdAt),
            read: notification.isRead,
            icon: this.getIcon(notification.type)
          })
        );

        // Tell Angular to update the UI
        this.changeDetectorRef.markForCheck();
      },

      error: (error) => {
        console.error('Failed to load notifications:', error);

        this.changeDetectorRef.markForCheck();
      }
    });
  }

  get notifications(): AppNotification[] {
    return this.notificationsList;
  }

  get filteredNotifications(): AppNotification[] {
    if (this.activeFilter === 'unread') {
      return this.notificationsList.filter(
        notification => !notification.read
      );
    }

    return this.notificationsList;
  }

  get unreadCount(): number {
    return this.notificationsList.filter(
      notification => !notification.read
    ).length;
  }

  get readCount(): number {
    return this.notificationsList.filter(
      notification => notification.read
    ).length;
  }

  markAsRead(notification: AppNotification): void {

    if (notification.read) {
      return;
    }

    this.notificationService
      .markAsRead(notification.id)
      .subscribe({
        next: () => {

          notification.read = true;

          this.changeDetectorRef.markForCheck();
        },

        error: (error) => {
          console.error(
            'Failed to mark notification as read:',
            error
          );

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  markAllAsRead(): void {

    this.notificationService
      .markAllAsRead()
      .subscribe({
        next: () => {

          this.notificationsList.forEach(notification => {
            notification.read = true;
          });

          this.changeDetectorRef.markForCheck();
        },

        error: (error) => {
          console.error(
            'Failed to mark all notifications as read:',
            error
          );

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  setFilter(filter: 'all' | 'unread'): void {
    this.activeFilter = filter;
  }

  private getIcon(type: string): string {

    switch (type) {

      case 'NEW_OFFER':
      case 'MAINTENANCE_CREATED':
      case 'TICKET_ASSIGNED':
      case 'TICKET_STATUS_CHANGED':
        return '🔧';

      case 'VISITOR_REQUEST':
      case 'VISITOR_APPROVED':
      case 'VISITOR_REJECTED':
      case 'VISITOR_CHECKED_IN':
      case 'VISITOR_CHECKED_OUT':
        return '👤';

      case 'NEW_MESSAGE':
        return '💬';

      case 'INVOICE_CREATED':
      case 'INVOICE_DUE':
        return '💳';

      case 'NEW_NEGOTIATION':
      case 'OFFER_ACCEPTED':
      case 'OFFER_REJECTED':
        return '🤝';

      case 'ACCOUNT_APPROVED':
      case 'ACCOUNT_REJECTED':
        return '👤';

      default:
        return '🔔';
    }
  }

  private formatTime(dateString: string): string {

    const date = new Date(dateString);
    const now = new Date();

    const difference = now.getTime() - date.getTime();

    const minutes = Math.floor(
      difference / (1000 * 60)
    );

    const hours = Math.floor(
      difference / (1000 * 60 * 60)
    );

    const days = Math.floor(
      difference / (1000 * 60 * 60 * 24)
    );

    if (minutes < 1) {
      return 'Just now';
    }

    if (minutes < 60) {
      return `${minutes} minutes ago`;
    }

    if (hours < 24) {
      return `${hours} hours ago`;
    }

    if (days === 1) {
      return 'Yesterday';
    }

    return `${days} days ago`;
  }
}
