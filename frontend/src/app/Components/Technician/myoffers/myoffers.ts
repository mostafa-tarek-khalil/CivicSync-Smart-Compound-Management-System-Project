import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { TechnicianService } from '../../../Services/techinican';
import { IOffer } from '../../../Models/ioffers';

@Component({
  selector: 'app-my-offers',
  standalone: true,
  imports: [CommonModule, RouterModule],
templateUrl: './myoffers.html',
  styleUrl: './myoffers.css'
})
export class MyOffersComponent implements OnInit {

  offers: IOffer[] = [];

  loading = false;
  errorMessage = '';

  constructor(
    private technicianService: TechnicianService
  ) {}

  ngOnInit(): void {
    this.loadOffers();
  }

  loadOffers(): void {

    this.loading = true;
    this.errorMessage = '';

    this.technicianService.getMyOffers().subscribe({
      next: (res) => {
        this.offers = res.offers || [];
        this.loading = false;
      },

      error: (err) => {
        console.error('Error loading offers:', err);

        this.errorMessage =
          err.error?.message || 'Unable to load offers.';

        this.loading = false;
      }
    });
  }

  getTechnicianName(offer: IOffer): string {

    if (typeof offer.technicianId === 'string') {
      return 'You';
    }

    return offer.technicianId.name || 'You';
  }

  getStatusClass(status: string): string {

    if (status === 'ACCEPTED') {
      return 'accepted';
    }

    if (status === 'REJECTED') {
      return 'rejected';
    }

    if (status === 'WITHDRAWN') {
      return 'withdrawn';
    }

    return 'pending';
  }

  /** الـ ticketId ممكن يكون populate كـ object من الباك إند — نضمن إنه string */
  getTicketId(offer: IOffer): string {
    if (typeof offer.ticketId === 'string') {
      return offer.ticketId;
    }

    return (offer.ticketId as { _id?: string })?._id || '';
  }

  withdrawOffer(id: string): void {

    const confirmed = confirm(
      'Are you sure you want to withdraw this offer?'
    );

    if (!confirmed) {
      return;
    }

    this.technicianService.withdrawOffer(id).subscribe({
      next: () => {
        this.loadOffers();
      },

      error: (err) => {
        console.error('Error withdrawing offer:', err);

        alert(
          err.error?.message || 'Unable to withdraw offer.'
        );
      }
    });
  }
}