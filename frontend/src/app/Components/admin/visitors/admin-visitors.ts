import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminVisit } from '../../../Services/admin-service';
import { buildFilters } from '../../../core/utils/filters';
import { RealtimeRefresh } from '../../../core/utils/realtime-refresh';
import { ChatSocket } from '../../../core/services/chat-socket';

/**
 * Admin visitor oversight: a compound-wide view of all visits, complementing
 * the resident approval list and the security gate operations.
 */
@Component({
  selector: 'app-admin-visitors',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-visitors.html',
  styleUrl: '../shared/admin-shared.css'
})
export class AdminVisitors implements OnInit, OnDestroy {

  visits: AdminVisit[] = [];
  loading = false;
  errorMessage = '';

  statusFilter = '';
  sourceFilter = '';

  readonly statuses = [
    '',
    'PENDING',
    'APPROVED',
    'QR_GENERATED',
    'CHECKED_IN',
    'CHECKED_OUT',
    'REJECTED',
    'EXPIRED'
  ];

  readonly sources = ['', 'RESIDENT_INVITE', 'VISITOR_REQUEST'];

  private readonly realtime: RealtimeRefresh;

  constructor(
    private adminService: AdminService,
    private chatSocket: ChatSocket,
    private cdr: ChangeDetectorRef
  ) {
    this.realtime = new RealtimeRefresh(
      this.chatSocket,
      [
        'VISITOR_REQUEST',
        'VISITOR_APPROVED',
        'VISITOR_CHECKED_IN',
        'VISITOR_CHECKED_OUT'
      ],
      () => this.load()
    );
  }

  ngOnInit(): void {
    this.load();
    this.realtime.start();
  }

  ngOnDestroy(): void {
    this.realtime.stop();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';

    this.adminService
      .getVisits(
        buildFilters({
          status: this.statusFilter,
          source: this.sourceFilter
        })
      )
      .subscribe({
        next: response => {
          this.visits = response.data || [];
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: error => {
          this.loading = false;
          this.errorMessage = error?.error?.message || 'Could not load visits.';
          this.cdr.detectChanges();
        }
      });
  }

  applyFilters(): void {
    this.load();
  }

  countBy(status: string): number {
    return this.visits.filter(visit => visit.status === status).length;
  }

  get activeCount(): number {
    return this.countBy('CHECKED_IN');
  }

  personLabel(value: unknown): string {
    if (!value) return '—';
    if (typeof value === 'object' && value !== null) {
      const person = value as { name?: string };
      return person.name || '—';
    }
    return '—';
  }

  unitLabel(value: unknown): string {
    if (!value) return '—';
    if (typeof value === 'object' && value !== null) {
      const unit = value as { unitNumber?: number | string };
      return unit.unitNumber != null ? `Unit ${unit.unitNumber}` : '—';
    }
    return '—';
  }

  statusClass(status: string): string {
    return 'status-' + String(status).toLowerCase();
  }

  sourceLabel(source: string): string {
    return source === 'VISITOR_REQUEST' ? 'Request' : 'Invite';
  }

  formatDate(value: string): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
