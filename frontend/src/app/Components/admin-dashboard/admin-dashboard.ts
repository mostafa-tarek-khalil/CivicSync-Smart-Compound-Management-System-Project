import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AdminDashboardOverview,
  AdminService,
  AdminUser
} from '../../Services/admin-service';
import { AuthService } from '../../core/services/auth.service';
import { ModalService } from '../../core/services/modal.service';
import { RealtimeRefresh } from '../../core/utils/realtime-refresh';
import { ChatSocket } from '../../core/services/chat-socket';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  overview: AdminDashboardOverview | null = null;
  pendingUsers: AdminUser[] = [];

  loading = true;
  usersLoading = false;
  actionUserId = '';
  errorMessage = '';

  private readonly realtime: RealtimeRefresh;

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private modalService: ModalService,
    private chatSocket: ChatSocket,
    private cdr: ChangeDetectorRef
  ) {
    this.realtime = new RealtimeRefresh(
      this.chatSocket,
      [
        'ACCOUNT_APPROVED',
        'VISITOR_CHECKED_IN',
        'VISITOR_CHECKED_OUT',
        'TICKET_STATUS_CHANGED',
        'MAINTENANCE_CREATED',
        'INVOICE_CREATED',
        'INVOICE_DUE'
      ],
      () => this.refresh()
    );
  }

  ngOnInit(): void {
    this.loadDashboard();
    this.loadPendingUsers();
    this.realtime.start();
  }

  ngOnDestroy(): void {
    this.realtime.stop();
  }

  private refresh(): void {
    this.loadDashboard();
    this.loadPendingUsers();
  }

  loadDashboard(): void {
    this.loading = true;
    this.errorMessage = '';

    this.adminService.getDashboard().subscribe({
      next: response => {
        this.overview = response.data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: error => {
        this.errorMessage =
          error?.error?.message ||
          'Unable to load the admin dashboard.';

        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadPendingUsers(): void {
    this.usersLoading = true;

    this.adminService.getUsers({ status: 'PENDING' }).subscribe({
      next: response => {
        this.pendingUsers = response.data || [];
        this.usersLoading = false;
        this.cdr.markForCheck();
      },
      error: error => {
        this.errorMessage =
          error?.error?.message ||
          'Unable to load pending users.';

        this.usersLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  approveUser(user: AdminUser): void {
    if (this.actionUserId) return;

    this.actionUserId = user._id;
    this.cdr.markForCheck();

    this.adminService.approveUser(user._id).subscribe({
      next: () => {
        this.actionUserId = '';
        this.loadDashboard();
        this.loadPendingUsers();
        this.cdr.markForCheck();
      },
      error: error => {
        this.errorMessage =
          error?.error?.message ||
          'Unable to approve this account.';

        this.actionUserId = '';
        this.cdr.markForCheck();
      }
    });
  }

  rejectUser(user: AdminUser): void {
    if (this.actionUserId) return;

    this.modalService
      .confirm({
        title: 'Reject registration',
        message: `Reject ${user.name}'s registration?`,
        confirmLabel: 'Reject',
        danger: true
      })
      .then(confirmed => {
        if (!confirmed) return;

        this.actionUserId = user._id;
        this.cdr.markForCheck();

        this.adminService.rejectUser(user._id).subscribe({
          next: () => {
            this.actionUserId = '';
            this.loadDashboard();
            this.loadPendingUsers();
            this.cdr.markForCheck();
          },
          error: error => {
            this.errorMessage =
              error?.error?.message ||
              'Unable to reject this account.';

            this.actionUserId = '';
            this.cdr.markForCheck();
          }
        });
      });
  }

  get currentUserName(): string {
    return this.authService.getUser()?.name || 'Administrator';
  }

  formatMoney(value: number | null | undefined): string {
    return `${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0)} EGP`;
  }
}