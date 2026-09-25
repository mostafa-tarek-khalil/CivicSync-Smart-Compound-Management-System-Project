import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService, AdminInvoice, AdminUser } from '../../../Services/admin-service';
import { buildFilters } from '../../../core/utils/filters';
import { RealtimeRefresh } from '../../../core/utils/realtime-refresh';
import { ModalService } from '../../../core/services/modal.service';
import { ChatSocket } from '../../../core/services/chat-socket';

/**
 * Admin billing management: monitor issued invoices, their statuses and the
 * overdue backlog. Completes the invoice lifecycle on the admin side.
 */
@Component({
  selector: 'app-admin-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-invoices.html',
  styleUrl: '../shared/admin-shared.css'
})
export class AdminInvoices implements OnInit, OnDestroy {

  invoices: AdminInvoice[] = [];
  loading = false;
  errorMessage = '';
  actioningId = '';

  statusFilter = '';

  readonly statuses = ['', 'PENDING', 'PAYMENT_SUBMITTED', 'PAID', 'OVERDUE', 'CANCELLED'];

  // ---------- Create invoice ----------
  invoiceModalOpen = false;
  savingInvoice = false;
  residents: AdminUser[] = [];
  loadingResidents = false;
  invoiceForm = {
    residentId: '',
    amount: null as number | null,
    dueDate: '',
    description: ''
  };

  private readonly realtime: RealtimeRefresh;

  constructor(
    private adminService: AdminService,
    private modalService: ModalService,
    private chatSocket: ChatSocket,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.realtime = new RealtimeRefresh(
      this.chatSocket,
      [
        'INVOICE_CREATED',
        'INVOICE_DUE',
        'INVOICE_PAID',
        'INVOICE_PAYMENT_SUBMITTED',
        'INVOICE_UPDATED'
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
      .getInvoices(buildFilters({ status: this.statusFilter }))
      .subscribe({
        next: response => {
          this.invoices = response.data || [];
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: error => {
          this.loading = false;
          this.errorMessage = error?.error?.message || 'Could not load invoices.';
          this.cdr.detectChanges();
        }
      });
  }

  applyFilters(): void {
    this.load();
  }

  /** Opens the printable receipt screen for one invoice. */
  openInvoice(invoice: AdminInvoice): void {
    this.router.navigate(['/admin/invoices', invoice._id]);
  }

  // ==================================================================
  // CREATE INVOICE
  // ==================================================================

  openCreateInvoice(): void {
    this.invoiceForm = {
      residentId: '',
      amount: null,
      dueDate: '',
      description: ''
    };
    this.errorMessage = '';
    this.invoiceModalOpen = true;
    this.loadResidents();
  }

  closeInvoiceModal(): void {
    if (this.savingInvoice) return;
    this.invoiceModalOpen = false;
  }

  private loadResidents(): void {
    this.loadingResidents = true;
    this.adminService.getUsers({ role: 'RESIDENT', status: 'ACTIVE' }).subscribe({
      next: response => {
        this.residents = response.data || [];
        this.loadingResidents = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.residents = [];
        this.loadingResidents = false;
        this.cdr.detectChanges();
      }
    });
  }

  saveInvoice(): void {
    if (
      !this.invoiceForm.residentId ||
      this.invoiceForm.amount == null ||
      !this.invoiceForm.dueDate
    ) {
      this.errorMessage = 'Resident, amount and due date are required.';
      return;
    }

    this.savingInvoice = true;
    this.errorMessage = '';

    this.adminService
      .createInvoice({
        residentId: this.invoiceForm.residentId,
        amount: Number(this.invoiceForm.amount),
        dueDate: this.invoiceForm.dueDate,
        description: this.invoiceForm.description?.trim() || undefined
      })
      .subscribe({
        next: () => {
          this.savingInvoice = false;
          this.invoiceModalOpen = false;
          this.load();
          this.cdr.detectChanges();
        },
        error: error => {
          this.savingInvoice = false;
          this.errorMessage = error?.error?.message || 'Could not create the invoice.';
          this.cdr.detectChanges();
        }
      });
  }

  residentNameById(id: string): string {
    const resident = this.residents.find(user => user._id === id);
    return resident ? resident.name : '—';
  }

  // ==================================================================
  // STATUS ACTIONS
  // ==================================================================

  /**
   * Confirms a payment as PAID. Available for anything not already settled —
   * including a resident's PAYMENT_SUBMITTED claim, which is the main case.
   */
  approvePaid(invoice: AdminInvoice): void {
    const fromClaim = invoice.status === 'PAYMENT_SUBMITTED';

    this.modalService
      .confirm({
        title: fromClaim ? 'Approve payment' : 'Mark as paid',
        message: fromClaim
          ? `Confirm the resident's payment of ${this.formatAmount(invoice.amount)} as received?`
          : `Mark this invoice as fully paid (${this.formatAmount(invoice.amount)})?`,
        confirmLabel: 'Approve paid'
      })
      .then(confirmed => {
        if (confirmed) {
          this.updateStatus(invoice, 'PAID');
        }
      });
  }

  markOverdue(invoice: AdminInvoice): void {
    this.updateStatus(invoice, 'OVERDUE');
  }

  cancelInvoice(invoice: AdminInvoice): void {
    this.modalService
      .confirm({
        title: 'Cancel invoice',
        message:
          'Cancel this invoice? The resident will no longer be charged for it.',
        confirmLabel: 'Cancel invoice',
        danger: true
      })
      .then(confirmed => {
        if (confirmed) {
          this.updateStatus(invoice, 'CANCELLED');
        }
      });
  }

  /** Unpaid = anything the resident still owes or has claimed to have paid. */
  isUnpaid(invoice: AdminInvoice): boolean {
    return (
      invoice.status === 'PENDING' ||
      invoice.status === 'OVERDUE' ||
      invoice.status === 'PAYMENT_SUBMITTED'
    );
  }

  private updateStatus(invoice: AdminInvoice, status: string): void {
    if (this.actioningId) return;

    this.actioningId = invoice._id;
    this.errorMessage = '';

    this.adminService.updateInvoiceStatus(invoice._id, status).subscribe({
      next: () => {
        this.actioningId = '';
        this.load();
      },
      error: error => {
        this.actioningId = '';
        this.errorMessage = error?.error?.message || 'Could not update the invoice.';
        this.cdr.detectChanges();
      }
    });
  }

  countBy(status: string): number {
    return this.invoices.filter(invoice => invoice.status === status).length;
  }

  get totalBilled(): number {
    return this.invoices
      .filter(invoice => invoice.status !== 'CANCELLED')
      .reduce((sum, invoice) => sum + (invoice.amount || 0), 0);
  }

  /** Only what has genuinely been confirmed as collected. */
  get totalCollected(): number {
    return this.invoices
      .filter(invoice => invoice.status === 'PAID')
      .reduce((sum, invoice) => sum + (invoice.amount || 0), 0);
  }

  get totalOutstanding(): number {
    return this.invoices
      .filter(invoice => this.isUnpaid(invoice))
      .reduce((sum, invoice) => sum + (invoice.amount || 0), 0);
  }

  /** Claims waiting on the admin right now — drives the alert banner. */
  get awaitingApprovalCount(): number {
    return this.countBy('PAYMENT_SUBMITTED');
  }

  formatAmount(amount: number | null | undefined): string {
    return `${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount || 0)} EGP`;
  }

  personLabel(value: unknown): string {
    if (!value) return '—';
    if (typeof value === 'object' && value !== null) {
      const person = value as { name?: string };
      return person.name || '—';
    }
    return '—';
  }

  ticketLabel(value: unknown): string {
    if (!value) return '—';
    if (typeof value === 'object' && value !== null) {
      const ticket = value as { title?: string };
      return ticket.title || '—';
    }
    return '—';
  }

  statusClass(status: string): string {
    return 'status-' + String(status).toLowerCase().replace(/_/g, '-');
  }

  formatDate(value: string): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}