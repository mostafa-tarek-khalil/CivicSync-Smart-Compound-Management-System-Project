import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

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
export class ResidentTicketDetailsComponent implements OnInit {

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

  constructor(
    private ticketService: MaintenanceTicketService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {

  this.ticket = {
    _id: '68c123456789abcdef123456',

    residentId: {
      name: 'Ahmed Mohamed'
    } as any,

    title: 'Water Leakage in Bathroom',

    category: 'PLUMBING',

    description:
      'There is a water leakage under the bathroom sink. The water has been leaking since yesterday and needs to be checked by a technician.',

    attachmentUrl: null,

    priority: 'HIGH',

    status: 'OPEN',

    assignedTo: {
      name: 'Mohamed Hassan'
    } as any,

    skippedBy: [],

    createdAt: '2026-09-20T10:30:00',

    updatedAt: '2026-09-21T14:15:00'
  };

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
        this.errorMessage = 'Unable to load ticket details.';
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