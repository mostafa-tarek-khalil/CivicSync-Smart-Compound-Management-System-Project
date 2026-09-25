import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  AdminReports,
  AdminService
} from '../../../Services/admin-service';
import {
  ChartComponent,
  ChartPoint,
  ChartSlice
} from '../../../shared/components/chart/chart';
import { ModalService } from '../../../core/services/modal.service';
import { RealtimeRefresh } from '../../../core/utils/realtime-refresh';
import { ChatSocket } from '../../../core/services/chat-socket';
import {
  buildCompoundReportCsv,
  downloadTextFile,
  reportFilename
} from '../../../core/utils/report-export';

/** Palette shared by every donut/bar so the same entity keeps its colour. */
const PALETTE = [
  '#315b8f',
  '#2f9e8f',
  '#d97706',
  '#c0392b',
  '#7c5cbf',
  '#4a7ab5'
];

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, ChartComponent],
  templateUrl: './admin-reports.html',
  styleUrl: './admin-reports.css'
})
export class AdminReportsPage implements OnInit, OnDestroy {
  reports: AdminReports | null = null;

  loading = false;
  errorMessage = '';
  exporting = false;

  private readonly realtime: RealtimeRefresh;

  constructor(
    private adminService: AdminService,
    private modalService: ModalService,
    private chatSocket: ChatSocket,
    private cdr: ChangeDetectorRef
  ) {
    this.realtime = new RealtimeRefresh(
      this.chatSocket,
      [
        'ACCOUNT_APPROVED',
        'MAINTENANCE_CREATED',
        'TICKET_STATUS_CHANGED',
        'INVOICE_CREATED',
        'INVOICE_DUE',
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

    this.adminService.getReports().subscribe({
      next: response => {
        this.reports = response.data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: error => {
        this.loading = false;
        this.errorMessage =
          error?.error?.message || 'Could not load the analytics report.';
        this.cdr.detectChanges();
      }
    });
  }

  // ------------------------------------------------------------------
  // Chart inputs — each maps an aggregate bucket list onto chart data.
  // ------------------------------------------------------------------

  private toSlices(
    buckets: { _id: string | null; count: number }[],
    emptyLabel = 'None'
  ): ChartSlice[] {
    return (buckets || []).map((bucket, index) => ({
      label: this.humanize(bucket._id) || emptyLabel,
      value: bucket.count,
      color: PALETTE[index % PALETTE.length]
    }));
  }

  get usersByRoleSlices(): ChartSlice[] {
    return this.toSlices(this.reports?.users.byRole || []);
  }

  get ticketStatusSlices(): ChartSlice[] {
    return this.toSlices(this.reports?.maintenance.byStatus || []);
  }

  get ticketPrioritySlices(): ChartSlice[] {
    return this.toSlices(this.reports?.maintenance.byPriority || []);
  }

  get invoiceStatusSlices(): ChartSlice[] {
    return this.toSlices(this.reports?.invoices.byStatus || []);
  }

  get visitStatusSlices(): ChartSlice[] {
    return this.toSlices(this.reports?.visits.byStatus || []);
  }

  /** Occupancy chart: derived from the unit status buckets. */
  get occupancySlices(): ChartSlice[] {
    const buckets = this.reports?.units.byStatus || [];

    return [
      {
        label: 'Occupied',
        value: buckets.find(bucket => bucket._id === 'OCCUPIED')?.count || 0,
        color: '#2f9e8f'
      },
      {
        label: 'Vacant',
        value: buckets.find(bucket => bucket._id === 'VACANT')?.count || 0,
        color: PALETTE[2]
      }
    ];
  }

  get occupancyRate(): number {
    const slices = this.occupancySlices;
    const total = slices.reduce((sum, slice) => sum + slice.value, 0);

    if (total === 0) {
      return 0;
    }

    return Math.round((slices[0].value / total) * 100);
  }

  /**
   * Visit series, zero-filled for the whole window so days without visits show
   * as a dip in the line rather than being silently compressed away.
   */
  get visitsOverTime(): ChartPoint[] {
    const points = this.reports?.visits.overTime || [];
    const byDate = new Map(points.map(point => [point.date, point.count]));

    const window: ChartPoint[] = [];
    const days = 30;
    const today = new Date();

    for (let offset = days - 1; offset >= 0; offset--) {
      const date = new Date(today);
      date.setDate(today.getDate() - offset);

      const key = date.toISOString().slice(0, 10);

      window.push({
        label: key.slice(5), // MM-DD keeps the axis readable
        value: byDate.get(key) ?? 0
      });
    }

    return window;
  }

  get revenue() {
    return this.reports?.revenue ?? null;
  }

  get totalVisits(): number {
    return (this.reports?.visits.byStatus || []).reduce(
      (sum, bucket) => sum + bucket.count,
      0
    );
  }

  get totalUsers(): number {
    return (this.reports?.users.byRole || []).reduce(
      (sum, bucket) => sum + bucket.count,
      0
    );
  }

  get totalTickets(): number {
    return (this.reports?.maintenance.byStatus || []).reduce(
      (sum, bucket) => sum + bucket.count,
      0
    );
  }

  // ------------------------------------------------------------------
  // Full report download
  // ------------------------------------------------------------------

  downloadFullReport(): void {
    if (this.exporting) {
      return;
    }

    this.exporting = true;

    this.adminService.getFullReport().subscribe({
      next: response => {
        this.exporting = false;

        try {
          const csv = buildCompoundReportCsv(response.data);
          downloadTextFile(reportFilename('csv'), csv);

          this.modalService.success(
            'The full compound report has been downloaded.'
          );
        } catch (error) {
          console.error('Report export failed:', error);
          this.modalService.error('Could not build the report file.');
        }

        this.cdr.detectChanges();
      },
      error: error => {
        this.exporting = false;
        this.modalService.error(
          error?.error?.message || 'Could not generate the report.'
        );
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Print-ready version: the browser's print dialog can save the current view
   * as PDF, so "PDF export" needs no extra library.
   */
  printReport(): void {
    window.print();
  }

  // ------------------------------------------------------------------
  // Formatting
  // ------------------------------------------------------------------

  /** `QR_GENERATED` -> `Qr generated`. */
  humanize(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const text = value.replace(/_/g, ' ').toLowerCase();

    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  money(value: number | undefined | null): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  formatDate(value: string): string {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}