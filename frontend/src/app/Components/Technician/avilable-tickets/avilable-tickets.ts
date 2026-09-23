import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { TechnicianService } from '../../../Services/techinican';
import { IMaintenanceTicket } from '../../../Models/imaintenance-ticket';

@Component({
  selector: 'app-available-requests',
  standalone: true,
  imports: [CommonModule, RouterModule],
templateUrl: './avilable-tickets.html',
  styleUrl: './avilable-tickets.css'
})
export class AvailableRequestsComponent implements OnInit {

  availableTickets: IMaintenanceTicket[] = [];

  loading = false;
  errorMessage = '';

  constructor(
    private technicianService: TechnicianService
  ) {}

  ngOnInit(): void {
    this.loadAvailableTickets();
  }

  loadAvailableTickets(): void {
    this.loading = true;
    this.errorMessage = '';

    this.technicianService.getAvailableTickets().subscribe({
      next: (res) => {
        this.availableTickets = res.tickets || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading available tickets:', err);

        this.errorMessage =
          err.error?.message || 'Unable to load available requests.';

        this.loading = false;
      }
    });
  }

  getPriorityClass(priority: string): string {
    if (priority === 'URGENT') {
      return 'urgent';
    }

    if (priority === 'HIGH') {
      return 'high';
    }

    if (priority === 'MEDIUM') {
      return 'medium';
    }

    return 'low';
  }

  getCategoryIcon(category: string): string {
    if (category === 'PLUMBING') {
      return 'fa-faucet-drip';
    }

    if (category === 'ELECTRICITY') {
      return 'fa-bolt';
    }

    if (category === 'ELEVATOR') {
      return 'fa-elevator';
    }

    if (category === 'AC') {
      return 'fa-snowflake';
    }

    return 'fa-wrench';
  }
}