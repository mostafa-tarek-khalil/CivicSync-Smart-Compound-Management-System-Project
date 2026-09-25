import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, finalize, timeout, catchError, throwError } from 'rxjs';

import { MaintenanceTicketService } from '../../../Services/maintenance-ticket';
import { IMaintenanceTicket } from '../../../Models/imaintenance-ticket';
import { IReview } from '../../../Models/ireviews';
import { ReviewService } from '../../../Services/reviews';
import { ChatSocket } from '../../../core/services/chat-socket';
import { ModalService } from '../../../core/services/modal.service';
import { resolveUploadUrl } from '../../../../environments/environment';

@Component({
  selector: 'app-resident-ticket-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ticket-details.html',
  styleUrl: './ticket-details.css'
})
export class ResidentTicketDetailsComponent implements OnInit, OnDestroy {

  ticket: IMaintenanceTicket | null = null;
  review: IReview | null = null;

  reviewRating = 5;
  reviewComment = '';
  isSubmittingReview = false;
  reviewError = '';

  isLoading = false;
  isClosing = false;

  errorMessage = '';

  statuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

  private routeSubscription: Subscription | null = null;
  private currentTicketId: string | null = null;

  private readonly liveRefreshTypes = new Set([
    'TICKET_ASSIGNED',
    'TICKET_STATUS_CHANGED',
    'NEW_OFFER',
    'OFFER_ACCEPTED'
  ]);

  private onNotification = (notification: { type: string; relatedId?: string }) => {
    if (notification && this.liveRefreshTypes.has(notification.type) && this.currentTicketId) {
      this.loadTicket(this.currentTicketId);
    }
  };

  constructor(
    private ticketService: MaintenanceTicketService,
    private route: ActivatedRoute,
    private router: Router,
    private reviewService: ReviewService,
    private cdr: ChangeDetectorRef,
    private chatSocket: ChatSocket,
    private modalService: ModalService
  ) {}

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.currentTicketId = id;
        this.loadTicket(id);
      }
    });

    this.chatSocket.connect();
    this.chatSocket.on('notification:new', this.onNotification);
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.chatSocket.off('notification:new', this.onNotification);
  }

  loadTicket(id: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.ticketService.getTicketDetails(id).pipe(
      timeout(15000),
      catchError(err => throwError(() => err)),
      finalize(() => {
        this.isLoading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (res) => {
        this.ticket = res.ticket;
        this.review = res.review || null;
        this.reviewRating = this.review?.rating || 5;
        this.reviewComment = this.review?.comment || '';
        this.reviewError = '';
      },
      error: (err) => {
        console.error('Error fetching ticket details:', err);
        this.errorMessage =
          err?.name === 'TimeoutError'
            ? 'The server took too long to respond. Please try again.'
            : err.error?.message || 'Unable to load ticket details.';
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/resident/maintenance-view']);
  }

  goToOffers(): void {
    if (!this.ticket) return;
    this.router.navigate(['/resident/maintenance', this.ticket._id, 'offers']);
  }

  closeTicket(): void {
    if (!this.ticket) return;

    this.modalService
      .confirm({
        title: 'Close maintenance request',
        message:
          'Are you sure you want to close this maintenance request?',
        confirmLabel: 'Close request'
      })
      .then((confirmed) => {
        if (!confirmed || !this.ticket) return;

        this.isClosing = true;
        this.ticketService.closeTicket(this.ticket._id).pipe(
          finalize(() => { this.isClosing = false; this.cdr.markForCheck(); })
        ).subscribe({
          next: (res) => { this.ticket = res.ticket; },
          error: (err) => {
            console.error('Error closing ticket:', err);
            this.errorMessage = err.error?.message || 'Unable to close this ticket.';
          }
        });
      });
  }

  submitReview(): void {
    if (!this.ticket || this.ticket.status !== 'CLOSED' || this.review || this.isSubmittingReview) {
      return;
    }
    if (this.reviewRating < 1 || this.reviewRating > 5) {
      this.reviewError = 'Please choose a rating from 1 to 5.';
      return;
    }

    this.isSubmittingReview = true;
    this.reviewError = '';

    this.reviewService.createReview(this.ticket._id, {
      rating: this.reviewRating,
      comment: this.reviewComment.trim() || null
    }).pipe(
      finalize(() => { this.isSubmittingReview = false; this.cdr.markForCheck(); })
    ).subscribe({
      next: response => { this.review = response.review || null; },
      error: err => { this.reviewError = err.error?.message || 'Unable to submit your review.'; }
    });
  }

  /** Absolute URL for the ticket photo (stored as a relative /uploads path). */
  get attachmentUrl(): string {
    return resolveUploadUrl(this.ticket?.attachmentUrl);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'OPEN': return 'status-open';
      case 'ASSIGNED': return 'status-assigned';
      case 'IN_PROGRESS': return 'status-progress';
      case 'RESOLVED': return 'status-resolved';
      case 'CLOSED': return 'status-closed';
      default: return '';
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'LOW': return 'priority-low';
      case 'MEDIUM': return 'priority-medium';
      case 'HIGH': return 'priority-high';
      case 'URGENT': return 'priority-urgent';
      default: return '';
    }
  }

  getStatusIndex(): number {
    if (!this.ticket) return 0;
    return this.statuses.indexOf(this.ticket.status);
  }

  getProgressWidth(): number {
    const currentIndex = this.getStatusIndex();
    if (currentIndex < 0) return 0;
    return (currentIndex / (this.statuses.length - 1)) * 100;
  }

  isStatusCompleted(status: string): boolean {
    if (!this.ticket) return false;
    const currentIndex = this.getStatusIndex();
    const statusIndex = this.statuses.indexOf(status);
    return statusIndex <= currentIndex;
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'OPEN': return 'Request Created';
      case 'ASSIGNED': return 'Assigned';
      case 'IN_PROGRESS': return 'In Progress';
      case 'RESOLVED': return 'Resolved';
      case 'CLOSED': return 'Closed';
      default: return status;
    }
  }

  getAssignedTechnicianName(): string {
    if (!this.ticket?.assignedTo) return 'Not assigned yet';
    if (typeof this.ticket.assignedTo === 'string') return this.ticket.assignedTo;
    return this.ticket.assignedTo.name || 'Assigned Technician';
  }

  getResidentName(): string {
    if (!this.ticket?.residentId) return 'Resident';
    if (typeof this.ticket.residentId === 'string') return this.ticket.residentId;
    return this.ticket.residentId.name || 'Resident';
  }
}