import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

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
 styleUrl: './tech-daseboard.css'
})
export class TechnicianDashboardComponent implements OnInit {

  availableTickets: IMaintenanceTicket[] = [];
  assignedTickets: IMaintenanceTicket[] = [];
  offers: IOffer[] = [];
  reviews: IReview[] = [];

  averageRating = 0;

  loading = true;

  constructor(
    private technicianService: TechnicianService
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {

    let loaded = 0;

    const done = () => {
      loaded++;

      if (loaded === 4) {
        this.loading = false;
        this.calculateRating();
      }
    };

    this.technicianService.getAvailableTickets().subscribe({
      next: response => {
        this.availableTickets = response.tickets;
        done();
      },
      error: () => done()
    });

    this.technicianService.getAssignedTickets().subscribe({
      next: response => {
        this.assignedTickets = response.tickets;
        done();
      },
      error: () => done()
    });

    this.technicianService.getMyOffers().subscribe({
      next: response => {
        this.offers = response.offers;
        done();
      },
      error: () => done()
    });

    this.technicianService.getTechnicianReviews().subscribe({
      next: response => {
        this.reviews = response.reviews;
        done();
      },
      error: () => done()
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