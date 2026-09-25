import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { TechnicianService } from '../../../Services/techinican';
import { IOffer } from '../../../Models/ioffers';
import { ModalService } from '../../../core/services/modal.service';

@Component({
  selector: 'app-my-offers',
  standalone: true,
  imports: [CommonModule, RouterModule],
templateUrl: './myoffers.html',
  styleUrls: ['./myoffers.css', '../shared/tech-shared.css']
})
export class MyOffersComponent implements OnInit {

  offers: IOffer[] = [];

  loading = false;
  errorMessage = '';

  constructor(
    private technicianService: TechnicianService,
    private modalService: ModalService,
    private cdr: ChangeDetectorRef
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
        this.cdr.markForCheck();
      },

      error: (err) => {
        console.error('Error loading offers:', err);

        this.errorMessage =
          err.error?.message || 'Unable to load offers.';

        this.loading = false;

        this.cdr.markForCheck();
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

  /**
   * Negotiation is only meaningful while the offer is still PENDING; once it is
   * accepted/rejected/withdrawn (or the job is resolved/closed) the thread is
   * read-only, so the action is removed entirely.
   */
  canNegotiate(offer: IOffer): boolean {
    return offer.status === 'PENDING';
  }

  withdrawOffer(id: string): void {
    this.modalService
      .confirm({
        title: 'Withdraw offer',
        message: 'Are you sure you want to withdraw this offer?',
        confirmLabel: 'Withdraw',
        danger: true
      })
      .then((confirmed) => {
        if (!confirmed) {
          return;
        }

        this.technicianService.withdrawOffer(id).subscribe({
          next: () => {
            this.loadOffers();
          },

          error: (err) => {
            console.error('Error withdrawing offer:', err);

            this.modalService.error(
              err.error?.message || 'Unable to withdraw offer.'
            );
          }
        });
      });
  }
}