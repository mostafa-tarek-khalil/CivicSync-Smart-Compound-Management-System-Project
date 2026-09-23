import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';

import { TechnicianService } from '../../../Services/techinican';

@Component({
  selector: 'app-create-offer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './createoffer.html',
  styleUrl: './createoffer.css'
})
export class CreateOfferComponent implements OnInit {

  ticketId: string = '';

  price: number | null = null;
  estimatedDuration: number | null = null;
  note: string = '';

  loading: boolean = false;
  errorMessage: string = '';

  constructor(
    private technicianService: TechnicianService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.ticketId = id;
    }
  }

  createOffer(): void {
    if (!this.price || !this.estimatedDuration || !this.ticketId) {
      this.errorMessage = 'Please provide both price and duration.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const data = {
      price: this.price,
      estimatedDuration: this.estimatedDuration,
      note: this.note
    };

    this.technicianService.createOffer(this.ticketId, data).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/technician/my-offers']);
      },
      error: (err: any) => {
        console.error('Error submitting offer:', err);
        this.errorMessage = err.error?.message || 'Unable to submit your offer.';
        this.loading = false;
      }
    });
  }

  // Alias في حال استدعائها بأي من الاسمين
  submitOffer(): void {
    this.createOffer();
  }

  cancel(): void {
    this.router.navigate(['/technician/available-request', this.ticketId]);
  }
}