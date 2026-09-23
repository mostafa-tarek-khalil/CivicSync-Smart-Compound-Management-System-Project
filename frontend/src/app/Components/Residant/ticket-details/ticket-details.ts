import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { MaintenanceTicketService } from '../../../Services/maintenance-ticket';
import { IMaintenanceTicket } from '../../../Models/imaintenance-ticket';

import { NavbarComponent } from '../navbar/navbar';

@Component({
  selector: 'app-resident-ticket-details',
  standalone: true,
  imports: [
    CommonModule,
    NavbarComponent
  ],
  templateUrl: './ticket-details.html',
  styleUrl: './ticket-details.css'
})
export class ResidentTicketDetailsComponent implements OnInit, OnDestroy {

  ticket: IMaintenanceTicket | null = null;

  isLoading = false;
  isClosing = false;

  errorMessage = '';

  statuses = [
    'OPEN',
    'ASSIGNED',
    'IN_PROGRESS',
    'RESOLVED',
    'CLOSED'
  ];

  private routeSubscription: Subscription | null = null;

  constructor(
    private ticketService: MaintenanceTicketService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // الاشتراك في تغييرات الـ params يدعم إعادة تحميل نفس الصفحة لمعرف تذكرة مختلف
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      const id = params.get('id');

      if (id) {
        this.loadTicket(id);
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  loadTicket(id: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.ticketService.getTicketDetails(id).subscribe({
      next: (res) => {
        this.ticket = res.ticket;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching ticket details:', err);
        this.errorMessage =
          err.error?.message || 'Unable to load ticket details.';
        this.isLoading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/resident/maintenance-view']);
  }

  goToOffers(): void {
    if (!this.ticket) return;

    this.router.navigate([
      '/resident/maintenance',
      this.ticket._id,
      'offers'
    ]);
  }

  closeTicket(): void {
    if (!this.ticket) return;

    const confirmed = confirm(
      'Are you sure you want to close this maintenance request?'
    );

    if (!confirmed) return;

    this.isClosing = true;

    this.ticketService.closeTicket(this.ticket._id).subscribe({
      next: (res) => {
        this.ticket = res.ticket;
        this.isClosing = false;
      },
      error: (err) => {
        console.error('Error closing ticket:', err);
        this.errorMessage =
          err.error?.message || 'Unable to close this ticket.';
        this.isClosing = false;
      }
    });
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

  getStatusIndex(): number {
    if (!this.ticket) return 0;

    return this.statuses.indexOf(this.ticket.status);
  }

  getProgressWidth(): number {
    const currentIndex = this.getStatusIndex();

    if (currentIndex < 0) {
      return 0;
    }

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
      case 'OPEN':
        return 'Request Created';

      case 'ASSIGNED':
        return 'Assigned';

      case 'IN_PROGRESS':
        return 'In Progress';

      case 'RESOLVED':
        return 'Resolved';

      case 'CLOSED':
        return 'Closed';

      default:
        return status;
    }
  }

  getAssignedTechnicianName(): string {
    if (!this.ticket?.assignedTo) {
      return 'Not assigned yet';
    }

    if (typeof this.ticket.assignedTo === 'string') {
      return this.ticket.assignedTo;
    }

    return this.ticket.assignedTo.name || 'Assigned Technician';
  }

  getResidentName(): string {
    if (!this.ticket?.residentId) {
      return 'Resident';
    }

    if (typeof this.ticket.residentId === 'string') {
      return this.ticket.residentId;
    }

    return this.ticket.residentId.name || 'Resident';
  }
}