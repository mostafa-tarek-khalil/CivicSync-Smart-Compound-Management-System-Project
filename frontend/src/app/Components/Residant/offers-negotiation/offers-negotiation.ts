import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { NavbarComponent } from '../navbar/navbar';
import { IOffer } from '../../../Models/ioffers';
import {
  INegotiation,
  ICreateNegotiationDto
} from '../../../Models/inegotiation';

import { OfferService } from '../../../Services/offer-service';
import { NegotiationService } from '../../../Services/negotition-service';

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NavbarComponent
  ],
  templateUrl: './offers-negotiation.html',
  styleUrl: './offers-negotiation.css'
})
export class OffersComponent implements OnInit {

  ticketId = '';
  offers: IOffer[] = [];
  selectedOffer: IOffer | null = null;
  negotiations: INegotiation[] = [];

  negotiationPrice = 0;
  negotiationMessage = '';

  isLoading = false;
  isNegotiationLoading = false;
  isSendingNegotiation = false;
  isAccepting = false;

  errorMessage = '';
  acceptErrorMessage = '';

  constructor(
    private offerService: OfferService,
    private negotiationService: NegotiationService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.ticketId = this.route.snapshot.paramMap.get('id') || '';

    if (this.ticketId) {
      this.loadOffers();
    }
  }

  loadOffers(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.offerService
      .getTicketOffers(this.ticketId)
      .subscribe({
        next: (res) => {
          this.offers = res.offers || [];
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading offers:', err);
          this.errorMessage =
            err.error?.message || 'Unable to load offers.';
          this.isLoading = false;
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/resident/maintenance', this.ticketId]);
  }

  getTechnicianName(offer: IOffer): string {
    if (typeof offer.technicianId === 'string') {
      return 'Technician';
    }
    return offer.technicianId?.name || 'Technician';
  }

  getTechnicianRating(offer: IOffer): number {
    if (typeof offer.technicianId === 'string') {
      return 0;
    }
    return offer.technicianId?.rating || 0;
  }

  getTechnicianSpecialization(offer: IOffer): string {
    if (typeof offer.technicianId === 'string' || !offer.technicianId) {
      return 'Technician';
    }

    const tech = offer.technicianId;

    if ('specializations' in tech && Array.isArray(tech.specializations) && tech.specializations.length > 0) {
      return tech.specializations[0];
    }

    if ('specialization' in tech && typeof tech.specialization === 'string' && tech.specialization.trim() !== '') {
      return tech.specialization;
    }

    return 'General Maintenance';
  }

  acceptOffer(offer: IOffer): void {
    const confirmed = confirm(
      `Are you sure you want to accept the offer from ${this.getTechnicianName(offer)}?`
    );

    if (!confirmed) {
      return;
    }

    this.isAccepting = true;
    this.acceptErrorMessage = '';

    this.offerService
      .acceptOffer(offer._id)
      .subscribe({
        next: () => {
          this.isAccepting = false;
          offer.status = 'ACCEPTED';

          this.offers.forEach((item) => {
            if (item._id !== offer._id && item.status === 'PENDING') {
              item.status = 'REJECTED';
            }
          });
        },
        error: (err) => {
          console.error('Error accepting offer:', err);
          this.acceptErrorMessage =
            err.error?.message || 'Unable to accept this offer. Please try again.';
          this.isAccepting = false;
        }
      });
  }

  openNegotiation(offer: IOffer): void {
    this.selectedOffer = offer;
    this.negotiationPrice = offer.price;
    this.negotiationMessage = '';
    this.loadNegotiations(offer._id);
  }

  closeNegotiation(): void {
    this.selectedOffer = null;
    this.negotiations = [];
    this.negotiationPrice = 0;
    this.negotiationMessage = '';
  }

  loadNegotiations(offerId: string): void {
    this.isNegotiationLoading = true;

    this.negotiationService
      .getNegotiations(offerId)
      .subscribe({
        next: (res) => {
          this.negotiations = res.negotiations || [];
          this.isNegotiationLoading = false;
        },
        error: (err) => {
          console.error('Error loading negotiations:', err);
          this.errorMessage =
            err.error?.message || 'Unable to load negotiations.';
          this.negotiations = [];
          this.isNegotiationLoading = false;
        }
      });
  }

  sendNegotiation(): void {
    if (!this.selectedOffer || this.negotiationPrice <= 0) {
      return;
    }

    const data: ICreateNegotiationDto = {
      price: this.negotiationPrice,
      message: this.negotiationMessage.trim() || null
    };

    this.isSendingNegotiation = true;

    this.negotiationService
      .createNegotiation(this.selectedOffer._id, data)
      .subscribe({
        next: () => {
          this.isSendingNegotiation = false;
          this.negotiationMessage = '';
          this.loadNegotiations(this.selectedOffer!._id);
        },
        error: (err) => {
          console.error('Error sending negotiation:', err);
          this.errorMessage =
            err.error?.message || 'Unable to send your negotiation.';
          this.isSendingNegotiation = false;
        }
      });
  }

  getSenderName(negotiation: INegotiation): string {
    if (typeof negotiation.senderId === 'string') {
      return negotiation.senderRole === 'RESIDENT' ? 'You' : 'Technician';
    }

    return (
      negotiation.senderId?.name ||
      (negotiation.senderRole === 'RESIDENT' ? 'You' : 'Technician')
    );
  }
}