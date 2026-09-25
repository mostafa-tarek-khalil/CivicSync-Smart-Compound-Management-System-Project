import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { TechnicianService } from '../../../Services/techinican';
import { IMaintenanceTicket } from '../../../Models/imaintenance-ticket';
import { ModalService } from '../../../core/services/modal.service';

@Component({
  selector: 'app-assigned-jobs',
  standalone: true,
  imports: [CommonModule, RouterModule],
templateUrl: './tech-jobs.html',
  styleUrls: ['./tech-jobs.css', '../shared/tech-shared.css']
})
export class AssignedJobsComponent implements OnInit {

  assignedTickets: IMaintenanceTicket[] = [];

  loading = false;
  errorMessage = '';

  constructor(
    private technicianService: TechnicianService,
    private modalService: ModalService,
    private cdr: ChangeDetectorRef
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
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading assigned jobs:', err);

        this.errorMessage =
          err.error?.message || 'Unable to load assigned jobs.';

        this.loading = false;

        this.cdr.markForCheck();
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
    this.modalService
      .confirm({
        title: 'Start job',
        message: 'Are you sure you want to start this job?',
        confirmLabel: 'Start'
      })
      .then((confirmed) => {
        if (!confirmed) {
          return;
        }

        this.technicianService.startTicket(id).subscribe({
          next: () => {
            this.loadAssignedJobs();
          },
          error: (err) => {
            console.error('Error starting ticket:', err);

            this.modalService.error(
              err.error?.message || 'Unable to start this job.'
            );
          }
        });
      });
  }

  resolveTicket(id: string): void {
    this.modalService
      .confirm({
        title: 'Resolve job',
        message: 'Are you sure you want to mark this job as resolved?',
        confirmLabel: 'Resolve'
      })
      .then((confirmed) => {
        if (!confirmed) {
          return;
        }

        this.technicianService.resolveTicket(id).subscribe({
          next: () => {
            this.loadAssignedJobs();
          },
          error: (err) => {
            console.error('Error resolving ticket:', err);

            this.modalService.error(
              err.error?.message || 'Unable to resolve this job.'
            );
          }
        });
      });
  }
}