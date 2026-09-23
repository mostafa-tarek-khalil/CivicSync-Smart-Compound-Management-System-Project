import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { TechnicianService } from '../../../Services/techinican';
import { IMaintenanceTicket } from '../../../Models/imaintenance-ticket';

@Component({
  selector: 'app-assigned-jobs',
  standalone: true,
  imports: [CommonModule, RouterModule],
templateUrl: './tech-jobs.html',
  styleUrl: './tech-jobs.css'
})
export class AssignedJobsComponent implements OnInit {

  assignedTickets: IMaintenanceTicket[] = [];

  loading = false;
  errorMessage = '';

  constructor(
    private technicianService: TechnicianService
  ) {}

  ngOnInit(): void {
    this.loadAssignedJobs();
  }

  loadAssignedJobs(): void {
    this.loading = true;
    this.errorMessage = '';

    this.technicianService.getAssignedTickets().subscribe({
      next: (res) => {
        this.assignedTickets = res.tickets || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading assigned jobs:', err);

        this.errorMessage =
          err.error?.message || 'Unable to load assigned jobs.';

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

  getStatusClass(status: string): string {
    if (status === 'IN_PROGRESS') {
      return 'in-progress';
    }

    if (status === 'RESOLVED') {
      return 'resolved';
    }

    if (status === 'ASSIGNED') {
      return 'assigned';
    }

    return '';
  }

  startTicket(id: string): void {
    const confirmed = confirm(
      'Are you sure you want to start this job?'
    );

    if (!confirmed) {
      return;
    }

    this.technicianService.startTicket(id).subscribe({
      next: () => {
        this.loadAssignedJobs();
      },
      error: (err) => {
        console.error('Error starting ticket:', err);

        alert(
          err.error?.message || 'Unable to start this job.'
        );
      }
    });
  }

  resolveTicket(id: string): void {
    const confirmed = confirm(
      'Are you sure you want to mark this job as resolved?'
    );

    if (!confirmed) {
      return;
    }

    this.technicianService.resolveTicket(id).subscribe({
      next: () => {
        this.loadAssignedJobs();
      },
      error: (err) => {
        console.error('Error resolving ticket:', err);

        alert(
          err.error?.message || 'Unable to resolve this job.'
        );
      }
    });
  }
}