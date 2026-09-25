import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { MaintenanceTicketService } from '../../../Services/maintenance-ticket';
import { ChatSocket } from '../../../core/services/chat-socket';
import {
  IMaintenanceTicket
} from '../../../Models/imaintenance-ticket';
import {
  IResidentDashboard,
  IDashboardVisitor
} from '../../../Models/iresident-dashboard';

export interface ILatestInvoice {
  invoiceNumber: string;
  status: string;
  period: string;
  amount: number;
  issueDate: string;
  dueDate: string;
}

export interface IRecentVisitor {
  _id: string;
  name: string;
  date: string;
  time: string;
  status: string;
  statusLabel: string;
}

interface IDashboardData {
  visitorsCount: number;
  maintenanceCount: number;
  completedCount: number;
  outstandingBalance: number;
  paidBalance: number;
  /** The paid total split into the two things it was spent on. */
  paidMaintenance: number;
  paidInvoicesTotal: number;
  /**
   * Finished maintenance jobs that have not been invoiced yet. The resident
   * owes the agreed price for these the moment the ticket closes.
   */
  closedMaintenanceValue: number;
  closedMaintenanceCount: number;
  invoicesDue: number;
  maintenanceDue: number;
  unpaidInvoicesCount: number;
  uninvoicedMaintenanceCount: number;
  pendingVisitorRequests: number;
  openTickets: number;
  assignedTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  latestInvoice: ILatestInvoice | null;
  recentTickets: IMaintenanceTicket[];
  recentVisitors: IRecentVisitor[];
}

@Component({
  selector: 'app-resident-dashboard',
  standalone: true,

  imports: [
    CommonModule,
  ],
templateUrl: './residant-dashboard.html',
  styleUrl: './residant-dashboard.css'

})
export class ResidentDashboardComponent implements OnInit, OnDestroy {

  userName = '';

  dashboard: IDashboardData = {
    visitorsCount: 0,
    maintenanceCount: 0,
    completedCount: 0,
    outstandingBalance: 0,
    paidBalance: 0,
    paidMaintenance: 0,
    paidInvoicesTotal: 0,
    closedMaintenanceValue: 0,
    closedMaintenanceCount: 0,
    invoicesDue: 0,
    maintenanceDue: 0,
    unpaidInvoicesCount: 0,
    uninvoicedMaintenanceCount: 0,
    pendingVisitorRequests: 0,
    openTickets: 0,
    assignedTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    closedTickets: 0,
    latestInvoice: null,
    recentTickets: [],
    recentVisitors: []
  };

  isLoading = false;
  isRefreshing = false;
  lastUpdated: Date | null = null;
  errorMessage = '';

  /**
   * Anything that can change the numbers on this page (new offer accepted,
   * ticket moved by the technician, invoice issued or paid, visitor request)
   * arrives over the realtime socket. We debounce the burst of events and
   * reload once.
   */
  private readonly REALTIME_TYPES = [
    'MAINTENANCE_CREATED',
    'TICKET_ASSIGNED',
    'TICKET_STATUS_CHANGED',
    'NEW_OFFER',
    'OFFER_ACCEPTED',
    'OFFER_REJECTED',
    'NEW_NEGOTIATION',
    'INVOICE_CREATED',
    'INVOICE_DUE',
    'INVOICE_PAID',
    'INVOICE_PAYMENT_SUBMITTED',
    'INVOICE_UPDATED',
    'VISITOR_REQUEST',
    'VISITOR_APPROVED',
    'VISITOR_REJECTED',
    'VISITOR_CHECKED_IN',
    'VISITOR_CHECKED_OUT'
  ];
  /**
   * The socket channels this page listens on. `notification:new` is the
   * per-user fan-out (already used by the notifications screen), `visit:updated`
   * is emitted by the visit state machine.
   */
  private readonly REALTIME_CHANNELS = ['notification:new', 'visit:updated'];

  private readonly AUTO_REFRESH_MS = 60 * 1000;

  private refreshTimer?: ReturnType<typeof setInterval>;
  private debounceTimer?: ReturnType<typeof setTimeout>;

  /**
   * One listener for both transports: the per-user notification channel and the
   * visit channel. Unrelated notifications (e.g. a new chat message) are
   * ignored so the dashboard is not re-fetched on every message.
   */
  private onRealtimeEvent = (payload?: { type?: string }) => {
    if (payload?.type && !this.REALTIME_TYPES.includes(payload.type)) {
      return;
    }

    this.scheduleReload();
  };

  constructor(
    private router: Router,
    private authService: AuthService,
    private ticketService: MaintenanceTicketService,
    private chatSocket: ChatSocket,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUserName();
    this.loadDashboard();
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.REALTIME_CHANNELS.forEach((event) =>
      this.chatSocket.off(event, this.onRealtimeEvent)
    );
  }

  loadUserName(): void {
    const user = this.authService.getUser();
    this.userName = user?.name || 'Resident';
  }

  /** Realtime updates + a slow safety-net poll (visitor/ticket data can also
   *  change from the security or technician side without notifying us).
   *
   *  No `runOutsideAngular` wrapper: this app is zoneless, so there is no zone
   *  to escape from. The socket listeners and the interval simply mutate signals
   *  / call the loader, and Angular schedules the render itself. */
  private setupAutoRefresh(): void {
    this.chatSocket.connect();

    this.REALTIME_CHANNELS.forEach((event) =>
      this.chatSocket.on(event, this.onRealtimeEvent)
    );

    this.refreshTimer = setInterval(() => {
      if (!this.isLoading && !this.isRefreshing) {
        this.loadDashboard(true);
      }
    }, this.AUTO_REFRESH_MS);
  }

  private scheduleReload(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => this.loadDashboard(true), 400);
  }

  /** Manual refresh from the Refresh button. */
  refresh(): void {
    this.loadDashboard(true);
  }

  loadDashboard(silent = false): void {
    if (silent) {
      this.isRefreshing = true;
    } else {
      this.isLoading = true;
    }

    this.errorMessage = '';

    this.ticketService.getDashboard().subscribe({
      next: (res) => {
        this.applyDashboardData(res.data);
        this.lastUpdated = new Date();
        this.isLoading = false;
        this.isRefreshing = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading dashboard:', err);
        this.errorMessage =
          err.error?.message || 'Unable to load dashboard data.';
        this.isLoading = false;
        this.isRefreshing = false;
        this.cdr.markForCheck();
      }
    });
  }

  private applyDashboardData(data: IResidentDashboard): void {
    if (!data) {
      return;
    }

    const tickets = data.recentTickets || [];

    this.dashboard.maintenanceCount = data.tickets?.total ?? tickets.length;
    this.dashboard.openTickets = data.tickets?.open ?? 0;
    this.dashboard.assignedTickets = data.tickets?.assigned ?? 0;
    this.dashboard.inProgressTickets = data.tickets?.inProgress ?? 0;
    this.dashboard.resolvedTickets = data.tickets?.resolved ?? 0;
    this.dashboard.closedTickets = data.tickets?.closed ?? 0;
    this.dashboard.completedCount = data.tickets?.completed ?? 0;

    this.dashboard.recentTickets = tickets;

    // Outstanding = unpaid invoices + agreed maintenance cost that has not
    // been invoiced yet (accepted offers on tickets still in progress).
    const billing = data.billing;
    this.dashboard.outstandingBalance = billing?.outstandingBalance ?? 0;
    this.dashboard.paidBalance = billing?.paidBalance ?? 0;
    this.dashboard.paidMaintenance = billing?.paidMaintenance ?? 0;
    this.dashboard.paidInvoicesTotal = billing?.paidInvoicesTotal ?? 0;
    this.dashboard.closedMaintenanceValue = billing?.closedMaintenanceValue ?? 0;
    this.dashboard.closedMaintenanceCount = billing?.closedMaintenanceCount ?? 0;
    this.dashboard.invoicesDue = billing?.invoicesDue ?? 0;
    this.dashboard.maintenanceDue = billing?.maintenanceDue ?? 0;
    this.dashboard.unpaidInvoicesCount = billing?.unpaidInvoicesCount ?? 0;
    this.dashboard.uninvoicedMaintenanceCount =
      billing?.uninvoicedMaintenanceCount ?? 0;

    const invoice = billing?.latestInvoice;
    this.dashboard.latestInvoice = invoice
      ? {
          invoiceNumber: `INV-${String(invoice._id).slice(-6).toUpperCase()}`,
          status: invoice.status,
          period: this.formatPeriod(invoice.issueDate),
          amount: invoice.amount,
          issueDate: this.formatDate(invoice.issueDate),
          dueDate: this.formatDate(invoice.dueDate)
        }
      : null;

    this.dashboard.visitorsCount = data.visitors?.thisMonth ?? 0;
    this.dashboard.pendingVisitorRequests =
      data.visitors?.pendingRequests ?? 0;
    this.dashboard.recentVisitors = (data.visitors?.recent || []).map(
      (visitor) => this.toRecentVisitor(visitor)
    );
  }

  private toRecentVisitor(visitor: IDashboardVisitor): IRecentVisitor {
    return {
      _id: visitor._id,
      name: visitor.visitorName,
      date: this.formatDate(visitor.visitDate),
      time: visitor.visitStartTime,
      status: visitor.status,
      statusLabel: this.visitorStatusLabel(visitor.status)
    };
  }

  private formatDate(value?: string | null): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  private formatPeriod(value?: string | null): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  }

  visitorStatusLabel(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      case 'QR_GENERATED':
        return 'QR Ready';
      case 'CHECKED_IN':
        return 'Checked In';
      case 'CHECKED_OUT':
        return 'Checked Out';
      case 'EXPIRED':
        return 'Expired';
      default:
        return status;
    }
  }

  getVisitorStatusClass(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'visitor-pending';
      case 'APPROVED':
      case 'QR_GENERATED':
        return 'visitor-approved';
      case 'CHECKED_IN':
        return 'visitor-checked-in';
      case 'REJECTED':
      case 'EXPIRED':
        return 'visitor-rejected';
      case 'CHECKED_OUT':
        return 'visitor-checked-out';
      default:
        return '';
    }
  }

  goToMaintenance(): void {
    this.router.navigate([
      '/resident/maintenance-view'
    ]);
  }

  goToVisitors(): void {
    this.router.navigate([
      '/resident/visitors'
    ]);
  }

  goToInvoices(): void {
    this.router.navigate([
      '/resident/invoices'
    ]);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'OPEN':
        return 'status-open';

      case 'ASSIGNED':
        return 'status-assigned';

      case 'IN_PROGRESS':
        return 'status-progress';

      case 'RESOLVED':
        return 'status-resolved';

      case 'CLOSED':
        return 'status-closed';

      default:
        return '';
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'LOW':
        return 'priority-low';

      case 'MEDIUM':
        return 'priority-medium';

      case 'HIGH':
        return 'priority-high';

      case 'URGENT':
        return 'priority-urgent';

      default:
        return '';
    }
  }
}