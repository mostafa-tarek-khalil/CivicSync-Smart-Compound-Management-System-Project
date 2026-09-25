import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ChatSocket } from '../../../core/services/chat-socket';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService, NotificationItem } from '../../../core/services/notification.service';
import { resolveNotificationRoute } from '../../../core/services/notification-navigator';

interface ToastEntry extends NotificationItem {
  toastId: number;
}

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-toast.html',
  styleUrl: './notification-toast.css'
})
export class NotificationToastComponent implements OnInit, OnDestroy {
  toasts: ToastEntry[] = [];
  private nextId = 1;
  private timers = new Map<number, ReturnType<typeof setTimeout>>();

  private onNotification = (notification: NotificationItem) => {
    if (!notification) return;

    const toastId = this.nextId++;
    this.toasts = [...this.toasts, { ...notification, toastId }];

    const timer = setTimeout(() => this.dismiss(toastId), 6000);
    this.timers.set(toastId, timer);
  };

  constructor(
    private chatSocket: ChatSocket,
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) return;
    this.chatSocket.connect();
    this.chatSocket.on('notification:new', this.onNotification);
  }

  ngOnDestroy(): void {
    this.chatSocket.off('notification:new', this.onNotification);
    this.timers.forEach(t => clearTimeout(t));
  }

  dismiss(toastId: number): void {
    this.toasts = this.toasts.filter(t => t.toastId !== toastId);
    const timer = this.timers.get(toastId);
    if (timer) { clearTimeout(timer); this.timers.delete(toastId); }
  }

  open(toast: ToastEntry): void {
    this.notificationService.markAsRead(toast._id).subscribe({ error: () => {} });

    const role = this.authService.getUser()?.role || '';
    const route = resolveNotificationRoute(toast.type, role, toast.relatedId);
    this.router.navigate(route);
    this.dismiss(toast.toastId);
  }
}