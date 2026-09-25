import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TechnicianService } from '../../../Services/techinican';
import { IReview } from '../../../Models/ireviews';

@Component({
  selector: 'app-technician-reviews',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './techreviews.html',
  styleUrls: ['./techreviews.css', '../shared/tech-shared.css']
})
export class TechnicianReviewsComponent implements OnInit {

  reviews: IReview[] = [];

  loading = false;
  errorMessage = '';

  constructor(
    private technicianService: TechnicianService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    this.loading = true;
    this.errorMessage = '';

    this.technicianService.getTechnicianReviews().subscribe({
      next: (res) => {
        this.reviews = res.reviews || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading reviews:', err);

        this.errorMessage =
          err.error?.message || 'Unable to load reviews.';

        this.loading = false;

        this.cdr.markForCheck();
      }
    });
  }

  getResidentName(review: IReview): string {

    if (typeof review.residentId === 'string') {
      return 'Resident';
    }

    return review.residentId.name || 'Resident';
  }

  getStars(rating: number): string[] {

    const stars: string[] = [];

    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push('full');
      } else {
        stars.push('empty');
      }
    }

    return stars;
  }

  getAverageRating(): number {

    if (this.reviews.length === 0) {
      return 0;
    }

    const total = this.reviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );

    return Number((total / this.reviews.length).toFixed(1));
  }
}