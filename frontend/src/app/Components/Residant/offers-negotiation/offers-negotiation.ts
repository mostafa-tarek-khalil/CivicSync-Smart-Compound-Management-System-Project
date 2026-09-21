import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { NavbarComponent } from '../navbar/navbar';
import { IOffer } from '../../../Models/ioffers';
import { INegotiation, ICreateNegotiationDto } from '../../../Models/inegotiation';
import { OfferService } from '../../../Services/offer-service';
import { NegotiationService } from '../../../Services/negotition-service';

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
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

  constructor(
    private offerService: OfferService,
    private negotiationService: NegotiationService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

ngOnInit(): void {

  this.ticketId = '68c123456789abcdef123456';

  this.offers = [
    {
      _id: 'offer1',
      ticketId: this.ticketId,
      technicianId: {
        _id: 'tech1',
        name: 'Mohamed Hassan',
        rating: 4.8,
        specialization: 'Plumbing'
      },
      price: 750,
      estimatedDuration: '2 Hours',
      message: 'I can fix the water leakage today.',
      status: 'PENDING',
      createdAt: '2026-09-21T12:00:00'
    }
  ];

}
  loadOffers(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.offerService.getTicketOffers(this.ticketId).subscribe({
      next: (res) => {
        this.offers = res.offers || [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading offers:', err);
        this.errorMessage = 'Unable to load offers.';
        this.isLoading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/resident/maintenance', this.ticketId]);
  }

  getTechnicianName(offer: IOffer): string {
    if (typeof offer.technicianId === 'string') {
      return offer.technicianId;
    }
    return offer.technicianId.name || 'Technician';
  }

  getTechnicianRating(offer: IOffer): number {
    if (typeof offer.technicianId === 'string') {
      return 0;
    }
    return offer.technicianId.rating || 0;
  }

  getTechnicianSpecialization(offer: IOffer): string {
    if (typeof offer.technicianId === 'string') {
      return 'Technician';
    }
    return offer.technicianId.specialization || 'General Maintenance';
  }

  acceptOffer(offer: IOffer): void {
    const confirmed = confirm(
      `Are you sure you want to accept the offer from ${this.getTechnicianName(offer)}?`
    );
    if (!confirmed) return;

    this.isAccepting = true;
    this.offerService.acceptOffer(offer._id).subscribe({
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
        this.isAccepting = false;
      }
    });
  }

  openNegotiation(offer: IOffer): void {

  this.selectedOffer = offer;

  this.negotiationPrice = offer.price;

  this.negotiationMessage = '';

  this.negotiations = [
    {
      _id: 'neg1',
      offerId: offer._id,
      senderId: {
        name: 'Mohamed Hassan'
      } as any,
      senderRole: 'TECHNICIAN',
      price: 750,
      message: 'I can complete the repair for 750 EGP.',
      createdAt: '2026-09-21T12:30:00',
      updatedAt: '2026-09-21T12:30:00'
    },
    {
      _id: 'neg2',
      offerId: offer._id,
      senderId: {
        name: 'Ahmed Mohamed'
      } as any,
      senderRole: 'RESIDENT',
      price: 650,
      message: 'Can you do it for 650 EGP?',
      createdAt: '2026-09-21T12:40:00',
      updatedAt: '2026-09-21T12:40:00'
    }
  ];

}

  closeNegotiation(): void {
    this.selectedOffer = null;
    this.negotiations = [];
    this.negotiationPrice = 0;
    this.negotiationMessage = '';
  }

  loadNegotiations(offerId: string): void {
    this.isNegotiationLoading = true;
    this.negotiationService.getNegotiations(offerId).subscribe({
      next: (res) => {
        this.negotiations = res.negotiations;
        this.isNegotiationLoading = false;
      },
      error: (err) => {
        console.error('Error loading negotiations:', err);
        this.isNegotiationLoading = false;
      }
    });
  }

  sendNegotiation(): void {
    if (!this.selectedOffer || this.negotiationPrice <= 0) return;

    const data: ICreateNegotiationDto = {
      price: this.negotiationPrice,
      message: this.negotiationMessage.trim() || null
    };

    this.isSendingNegotiation = true;
    this.negotiationService.createNegotiation(this.selectedOffer._id, data).subscribe({
      next: () => {
        this.isSendingNegotiation = false;
        this.negotiationMessage = '';
        this.loadNegotiations(this.selectedOffer!._id);
      },
      error: (err) => {
        console.error('Error sending negotiation:', err);
        this.isSendingNegotiation = false;
      }
    });
  }

  getSenderName(negotiation: INegotiation): string {
    if (typeof negotiation.senderId === 'string') {
      return negotiation.senderRole === 'RESIDENT' ? 'You' : 'Technician';
    }
    return negotiation.senderId.name || (negotiation.senderRole === 'RESIDENT' ? 'You' : 'Technician');
  }
}