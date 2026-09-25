import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { IOffer } from '../../../Models/ioffers';
import {
  INegotiation,
  ICreateNegotiationDto
} from '../../../Models/inegotiation';

import { OfferService } from '../../../Services/offer-service';
import { NegotiationService } from '../../../Services/negotition-service';
import { ChatSocket } from '../../../core/services/chat-socket';
import { ModalService } from '../../../core/services/modal.service';

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
  ],
  templateUrl: './offers-negotiation.html',
  styleUrl: './offers-negotiation.css'
})
export class OffersComponent implements OnInit, OnDestroy {

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

  private readonly liveRefreshTypes = new Set([
    'NEW_OFFER',
    'NEW_NEGOTIATION',
    'OFFER_ACCEPTED',
    'OFFER_REJECTED'
  ]);

  private onNotification = (notification: { type: string }) => {
    if (
      notification &&
      this.liveRefreshTypes.has(notification.type)
    ) {
      this.loadOffers();
    }
  };

  constructor(
    private offerService: OfferService,
    private negotiationService: NegotiationService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private chatSocket: ChatSocket,
    private modalService: ModalService
  ) {}

  ngOnInit(): void {
    this.ticketId = this.route.snapshot.paramMap.get('id') || '';

    const preselectOfferId =
      this.route.snapshot.queryParamMap.get('offerId');

    if (this.ticketId) {
      this.loadOffers(preselectOfferId || undefined);
    }

    this.chatSocket.connect();
    this.chatSocket.on('notification:new', this.onNotification);
  }

  ngOnDestroy(): void {
    this.chatSocket.off('notification:new', this.onNotification);
  }

  loadOffers(preselectOfferId?: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.offerService
      .getTicketOffers(this.ticketId)
      .subscribe({
        next: (res) => {
          this.offers = res.offers || [];
          this.isLoading = false;

          this.cdr.markForCheck();

          if (preselectOfferId) {
            const target = this.offers.find(
              (offer) => offer._id === preselectOfferId
            );

            if (target) {
              this.openNegotiation(target);
            }
          }
        },
        error: (err) => {
          console.error('Error loading offers:', err);

          this.errorMessage =
            err.error?.message || 'Unable to load offers.';

          this.isLoading = false;

          this.cdr.markForCheck();
        }
      });
  }

  goBack(): void {
    this.router.navigate([
      '/resident/maintenance',
      this.ticketId
    ]);
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
    if (
      typeof offer.technicianId === 'string' ||
      !offer.technicianId
    ) {
      return 'Technician';
    }

    const tech = offer.technicianId;

    if (
      'specializations' in tech &&
      Array.isArray(tech.specializations) &&
      tech.specializations.length > 0
    ) {
      return tech.specializations[0];
    }

    if (
      'specialization' in tech &&
      typeof tech.specialization === 'string' &&
      tech.specialization.trim() !== ''
    ) {
      return tech.specialization;
    }

    return 'General Maintenance';
  }

  acceptOffer(offer: IOffer): void {
    this.modalService
      .confirm({
        title: 'Accept offer',
        message: `Are you sure you want to accept the offer from ${this.getTechnicianName(offer)}?`,
        confirmLabel: 'Accept'
      })
      .then((confirmed) => {
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
                if (
                  item._id !== offer._id &&
                  item.status === 'PENDING'
                ) {
                  item.status = 'REJECTED';
                }
              });

              this.cdr.markForCheck();
            },
            error: (err) => {
              console.error('Error accepting offer:', err);

              this.acceptErrorMessage =
                err.error?.message ||
                'Unable to accept this offer. Please try again.';

              this.isAccepting = false;

              this.cdr.markForCheck();
            }
          });
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

          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error loading negotiations:', err);

          this.errorMessage =
            err.error?.message ||
            'Unable to load negotiations.';

          this.negotiations = [];
          this.isNegotiationLoading = false;

          this.cdr.markForCheck();
        }
      });
  }

  sendNegotiation(): void {
    if (
      !this.selectedOffer ||
      this.negotiationPrice <= 0
    ) {
      return;
    }

    const data: ICreateNegotiationDto = {
      price: this.negotiationPrice,
      message: this.negotiationMessage.trim() || null
    };

    this.isSendingNegotiation = true;

    this.negotiationService
      .createNegotiation(
        this.selectedOffer._id,
        data
      )
      .subscribe({
        next: () => {
          this.isSendingNegotiation = false;
          this.negotiationMessage = '';

          this.loadNegotiations(
            this.selectedOffer!._id
          );

          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error(
            'Error sending negotiation:',
            err
          );

          this.errorMessage =
            err.error?.message ||
            'Unable to send your negotiation.';

          this.isSendingNegotiation = false;

          this.cdr.markForCheck();
        }
      });
  }

  getSenderName(
    negotiation: INegotiation
  ): string {
    if (
      typeof negotiation.senderId === 'string'
    ) {
      return negotiation.senderRole === 'RESIDENT'
        ? 'You'
        : 'Technician';
    }

    return (
      negotiation.senderId?.name ||
      (
        negotiation.senderRole === 'RESIDENT'
          ? 'You'
          : 'Technician'
      )
    );
  }
}