import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService, NotificationItem } from '../../../core/services/notification.service';
import { resolveNotificationRoute } from '../../../core/services/notification-navigator';

interface AppNotification {
  id: string;
  type: string;
  relatedId: string | null;
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

  private get currentRole(): string {
    const raw = localStorage.getItem('user');
    try {
      return raw ? JSON.parse(raw)?.role || '' : '';
    } catch {
      return '';
    }
  }

  goBack(): void {
    const role = this.currentRole;
    let target = '/';
    if (role === 'SECURITY') target = '/security-dashboard';
    else if (role === 'RESIDENT') target = '/resident/dashboard';
    else if (role === 'TECHNICIAN') target = '/technician/dashboard';
    else if (role === 'ADMIN') target = '/admin/dashboard';
    this.router.navigate([target]);
  }

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.notificationService.getNotifications().subscribe({
      next: (response) => {
        this.notificationsList = response.data.map((notification: NotificationItem) => ({
          id: notification._id,
          type: notification.type,
          relatedId: notification.relatedId || null,
          title: notification.title,
          message: notification.message,
          time: this.formatTime(notification.createdAt),
          read: notification.isRead,
          icon: this.getIcon(notification.type)
        }));
        this.changeDetectorRef.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load notifications:', error);
        this.changeDetectorRef.markForCheck();
      }
    });
  }

  get notifications(): AppNotification[] { return this.notificationsList; }

  get filteredNotifications(): AppNotification[] {
    if (this.activeFilter === 'unread') {
      return this.notificationsList.filter(n => !n.read);
    }
    return this.notificationsList;
  }

  get unreadCount(): number { return this.notificationsList.filter(n => !n.read).length; }
  get readCount(): number { return this.notificationsList.filter(n => n.read).length; }

  /** Marks as read (if needed) AND navigates to the relevant page. */
  openNotification(notification: AppNotification): void {
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => { notification.read = true; this.changeDetectorRef.markForCheck(); },
        error: (error) => console.error('Failed to mark notification as read:', error)
      });
    }

    const route = resolveNotificationRoute(notification.type, this.currentRole, notification.relatedId);
    this.router.navigate(route);
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notificationsList.forEach(n => n.read = true);
        this.changeDetectorRef.markForCheck();
      },
      error: (error) => console.error('Failed to mark all notifications as read:', error)
    });
  }

  setFilter(filter: 'all' | 'unread'): void { this.activeFilter = filter; }

  private getIcon(type: string): string {
    switch (type) {
      case 'NEW_OFFER': case 'MAINTENANCE_CREATED': case 'TICKET_ASSIGNED': case 'TICKET_STATUS_CHANGED': return '🔧';
      case 'VISITOR_REQUEST': case 'VISITOR_APPROVED': case 'VISITOR_REJECTED': case 'VISITOR_CHECKED_IN': case 'VISITOR_CHECKED_OUT': return '👤';
      case 'NEW_MESSAGE': return '💬';
      case 'INVOICE_CREATED': case 'INVOICE_DUE': return '💳';
      case 'NEW_NEGOTIATION': case 'OFFER_ACCEPTED': case 'OFFER_REJECTED': return '🤝';
      case 'ACCOUNT_APPROVED': case 'ACCOUNT_REJECTED': return '👤';
      default: return '🔔';
    }
  }

  private formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const difference = now.getTime() - date.getTime();
    const minutes = Math.floor(difference / (1000 * 60));
    const hours = Math.floor(difference / (1000 * 60 * 60));
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  }
}