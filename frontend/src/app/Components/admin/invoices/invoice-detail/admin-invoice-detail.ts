import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { AdminService } from '../../../../Services/admin-service';
import { ChatSocket } from '../../../../core/services/chat-socket';
import { RealtimeRefresh } from '../../../../core/utils/realtime-refresh';
import { InvoiceReceipt } from '../../../../shared/invoice/invoice-receipt';
import { IInvoiceDetail } from '../../../../shared/invoice/invoice.model';

/**
 * Admin invoice receipt screen.
 *
 * Reached from the invoices table ("View") and from the maintenance ticket
 * details modal, so a linked invoice is only ever one click away from the job
 * that produced it. Renders the shared receipt component, which is what makes
 * the printed document identical for Admin, Resident and Technician.
 */
@Component({
  selector: 'app-admin-invoice-detail',
  standalone: true,
  imports: [CommonModule, InvoiceReceipt],
  templateUrl: './admin-invoice-detail.html',
  styleUrl: './admin-invoice-detail.css'
})
export class AdminInvoiceDetail implements OnInit, OnDestroy {

  invoice: IInvoiceDetail | null = null;
  loading = false;
  errorMessage = '';

  readonly viewerRole = 'Admin';

  private readonly realtime: RealtimeRefresh;
  private invoiceId = '';

  constructor(
    private adminService: AdminService,
    private route: ActivatedRoute,
    private router: Router,
    private chatSocket: ChatSocket,
    private cdr: ChangeDetectorRef
  ) {
    // Any change to this invoice (status confirmed, cancelled, due) reloads the
    // receipt in place. The admin does not have to reopen it.
    this.realtime = new RealtimeRefresh(
      this.chatSocket,
      [
        'INVOICE_CREATED',
        'INVOICE_DUE',
        'INVOICE_PAID',
        'INVOICE_PAYMENT_SUBMITTED',
        'INVOICE_UPDATED'
      ],
      () => this.load(true)
    );
  }

  ngOnInit(): void {
    this.invoiceId = this.route.snapshot.paramMap.get('invoiceId') || '';

    if (!this.invoiceId) {
      this.router.navigate(['/admin/invoices']);
      return;
    }

    this.load();
    this.realtime.start();
  }

  ngOnDestroy(): void {
    this.realtime.stop();
  }

  load(silent = false): void {
    if (!silent) {
      this.loading = true;
    }

    this.errorMessage = '';

    this.adminService.getInvoice(this.invoiceId).subscribe({
      next: response => {
        this.invoice = response.data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: error => {
        this.invoice = null;
        this.loading = false;
        this.errorMessage =
          error?.error?.message || 'Could not load the invoice.';
        this.cdr.detectChanges();
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/invoices']);
  }

  /** Drill-through from the receipt to the ticket that generated it. */
  openTicket(ticketId: string): void {
    this.router.navigate(['/admin/maintenance'], {
      queryParams: { ticketId }
    });
  }
}