
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ThemeService } from '../../services/theme';
import { NotificationService, NotificationItem } from '../../../../Services/notification-service';
import { AuthService } from '../../../../Services/auth-service';
import { ChatSocket } from '../../../../Services/chat-socket';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css'
})
export class Topbar implements OnInit, OnDestroy {

  searchOpen = false;
  notificationsOpen = false;
  profileOpen = false;

  notifications: NotificationItem[] = [];

  unreadCount = 0;

  constructor(
    public themeService: ThemeService,
    private notificationService: NotificationService,
    private chatSocket: ChatSocket,
    private router: Router,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadUnreadNotifications();
    this.setupRealtimeNotifications();
  }

  ngOnDestroy(): void {
    this.chatSocket.off('notification:new');
  }

  /**
   * Listen for notifications pushed by the backend in real time.
   * The backend emits `notification:new` to the `user:<id>` room, which every
   * authenticated socket (including security) joins on connect.
   */
  private setupRealtimeNotifications(): void {
    this.chatSocket.connect();

    this.chatSocket.on('notification:new', (notification: NotificationItem) => {
      if (!notification) {
        return;
      }

      const exists = this.notifications.some(
        item => String(item._id) === String(notification._id)
      );

      if (!exists) {
        this.notifications = [notification, ...this.notifications];
        this.unreadCount = this.notifications.length;
      }
    });
  }

  loadUnreadNotifications(): void {
    this.notificationService.getNotifications(true).subscribe({
      next: (response) => {
        this.notifications = response.data;
        this.unreadCount = response.data.length;
      },

      error: (error) => {
        console.error('Failed to load notifications:', error);
      }
    });
  }

  toggleSearch(): void {
    this.searchOpen = !this.searchOpen;
    this.notificationsOpen = false;
    this.profileOpen = false;
  }

  toggleNotifications(): void {
    this.notificationsOpen = !this.notificationsOpen;
    this.searchOpen = false;
    this.profileOpen = false;

    if (this.notificationsOpen) {
      this.loadUnreadNotifications();
    }
  }

  toggleProfile(): void {
    this.profileOpen = !this.profileOpen;
    this.searchOpen = false;
    this.notificationsOpen = false;
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  markAllAsRead(): void {
    if (this.unreadCount === 0) {
      return;
    }

    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications = [];
        this.unreadCount = 0;
      },

      error: (error) => {
        console.error('Failed to mark all notifications as read:', error);
      }
    });
  }

  markAsRead(notification: NotificationItem): void {
    if (notification.isRead) {
      return;
    }

    this.notificationService.markAsRead(notification._id).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(
          item => item._id !== notification._id
        );

        this.unreadCount = this.notifications.length;
      },

      error: (error) => {
        console.error('Failed to mark notification as read:', error);
      }
    });
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'NEW_OFFER':
      case 'MAINTENANCE_CREATED':
      case 'TICKET_ASSIGNED':
      case 'TICKET_STATUS_CHANGED':
        return 'build';

      case 'VISITOR_REQUEST':
      case 'VISITOR_APPROVED':
      case 'VISITOR_REJECTED':
      case 'VISITOR_CHECKED_IN':
      case 'VISITOR_CHECKED_OUT':
        return 'how_to_reg';

      case 'NEW_MESSAGE':
        return 'mail';

      case 'INVOICE_CREATED':
      case 'INVOICE_DUE':
        return 'receipt_long';

      case 'NEW_NEGOTIATION':
      case 'OFFER_ACCEPTED':
      case 'OFFER_REJECTED':
        return 'handshake';

      default:
        return 'notifications';
    }
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();

    const difference = now.getTime() - date.getTime();

    const minutes = Math.floor(difference / (1000 * 60));
    const hours = Math.floor(difference / (1000 * 60 * 60));
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));

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

  goToNotifications(): void {
    this.notificationsOpen = false;
    this.router.navigate(['/notifications']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  get currentUserName(): string {
    return this.authService.getUser()?.name || 'Account';
  }

  get currentUserRole(): string {
    const role = this.authService.getUser()?.role || '';
    return role.charAt(0) + role.slice(1).toLowerCase();
  }

  get currentUserInitial(): string {
    return this.currentUserName.charAt(0).toUpperCase();
  }
}
