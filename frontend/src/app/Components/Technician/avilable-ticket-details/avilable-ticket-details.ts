import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { TechnicianService } from '../../../Services/techinican';
import { IMaintenanceTicket } from '../../../Models/imaintenance-ticket';

@Component({
  selector: 'app-technician-ticket-details',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './avilable-ticket-details.html',
  styleUrl: './avilable-ticket-details.css'
})
export class TechnicianTicketDetailsComponent implements OnInit, OnDestroy {

  ticket: IMaintenanceTicket | null = null;

  /** 'available' = طلب متاح (Create Offer / Skip) | 'assigned' = شغل معين (Start / Resolve) */
  mode: 'available' | 'assigned' = 'available';

  loading = false;
  errorMessage = '';
  isProcessing = false;

  private routeSubscription: Subscription | null = null;

  constructor(
    private technicianService: TechnicianService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      this.mode =
        (this.route.snapshot.data['mode'] as 'available' | 'assigned') ||
        'available';

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
    this.loading = true;
    this.errorMessage = '';

    const request =
      this.mode === 'available'
        ? this.technicianService.getAvailableTicketDetails(id)
        : this.technicianService.getAssignedTicketDetails(id);

    request.subscribe({
      next: (res) => {
        this.ticket = res.ticket;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading ticket details:', err);
        this.errorMessage =
          err.error?.message || 'Unable to load ticket details.';
        this.loading = false;
      }
    });
  }

  /** طلب متاح: تجاهل الطلب وإرجاعه للطلبات المتاحة */
  skipTicket(): void {
    if (!this.ticket || this.isProcessing) return;

    const confirmed = confirm(
      'Are you sure you want to skip this request?'
    );

    if (!confirmed) return;

    this.isProcessing = true;

    this.technicianService.skipTicket(this.ticket._id).subscribe({
      next: () => {
        this.isProcessing = false;
        this.router.navigate(['/technician/available-requests']);
      },
      error: (err) => {
        console.error('Error skipping ticket:', err);
        alert(err.error?.message || 'Unable to skip this request.');
        this.isProcessing = false;
      }
    });
  }

  /** شغل معين: بدء التنفيذ */
  startTicket(): void {
    if (!this.ticket || this.isProcessing) return;

    const confirmed = confirm(
      'Are you sure you want to start this job?'
    );

    if (!confirmed) return;

    this.isProcessing = true;

    this.technicianService.startTicket(this.ticket._id).subscribe({
      next: (res) => {
        this.ticket = res.ticket;
        this.isProcessing = false;
      },
      error: (err) => {
        console.error('Error starting ticket:', err);
        alert(err.error?.message || 'Unable to start this job.');
        this.isProcessing = false;
      }
    });
  }

  /** شغل معين: تسليم وإنهاء الشغل */
  resolveTicket(): void {
    if (!this.ticket || this.isProcessing) return;

    const confirmed = confirm(
      'Are you sure you want to mark this job as resolved?'
    );

    if (!confirmed) return;

    this.isProcessing = true;

    this.technicianService.resolveTicket(this.ticket._id).subscribe({
      next: (res) => {
        this.ticket = res.ticket;
        this.isProcessing = false;
      },
      error: (err) => {
        console.error('Error resolving ticket:', err);
        alert(err.error?.message || 'Unable to resolve this job.');
        this.isProcessing = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate([
      this.mode === 'available'
        ? '/technician/available-requests'
        : '/technician/assigned-jobs'
    ]);
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