import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { TechnicianService } from '../../../Services/techinican';

import { IMaintenanceTicket } from '../../../Models/imaintenance-ticket';
import { IOffer } from '../../../Models/ioffers';
import { IReview } from '../../../Models/ireviews';

@Component({
  selector: 'app-technician-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './tech-daseboard.html',
  styleUrls: ['./tech-daseboard.css', '../shared/tech-shared.css']
})
export class TechnicianDashboardComponent implements OnInit {

  availableTickets: IMaintenanceTicket[] = [];
  assignedTickets: IMaintenanceTicket[] = [];
  offers: IOffer[] = [];
  reviews: IReview[] = [];

  averageRating = 0;

  loading = true;
  errorMessage = '';

  constructor(
    private technicianService: TechnicianService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      available: this.technicianService
        .getAvailableTickets()
        .pipe(catchError(() => of({ count: 0, tickets: [] as IMaintenanceTicket[] }))),
      assigned: this.technicianService
        .getAssignedTickets()
        .pipe(catchError(() => of({ count: 0, tickets: [] as IMaintenanceTicket[] }))),
      offers: this.technicianService
        .getMyOffers()
        .pipe(catchError(() => of({ offers: [] as IOffer[] }))),
      reviews: this.technicianService
        .getTechnicianReviews()
        .pipe(catchError(() => of({ count: 0, reviews: [] as IReview[] })))
    }).subscribe({
      next: result => {
        this.availableTickets = result.available.tickets ?? [];
        this.assignedTickets = result.assigned.tickets ?? [];
        this.offers = result.offers.offers ?? [];
        this.reviews = result.reviews.reviews ?? [];
        this.calculateRating();
        this.loading = false;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
        this.errorMessage = 'Could not load the dashboard.';
        this.cdr.detectChanges();
      }
    });
  }

  calculateRating(): void {

    if (this.reviews.length === 0) {
      this.averageRating = 0;
      return;
    }

    let total = 0;

    for (const review of this.reviews) {
      total += review.rating;
    }

    this.averageRating =
      Math.round((total / this.reviews.length) * 10) / 10;
  }

  getStars(rating: number): string[] {

    const stars: string[] = [];

    for (let i = 1; i <= 5; i++) {
      stars.push(i <= rating ? 'full' : 'empty');
    }

    return stars;
  }

  getResidentName(review: IReview): string {

    if (
      typeof review.residentId === 'object' &&
      review.residentId
    ) {
      return review.residentId.name;
    }

    return 'Resident';
  }
}