import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import {
  INegotiation,
  ICreateNegotiationDto
} from '../../../Models/inegotiation';

import { TechnicianService } from '../../../Services/techinican';

@Component({
  selector: 'app-negotiation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './technegetition.html',
  styleUrls: ['./technegetition.css', '../shared/tech-shared.css']
})
export class NegotiationComponent implements OnInit {

  offerId = '';

  negotiations: INegotiation[] = [];

  price = 0;

  message = '';

  loading = false;

  sending = false;

  errorMessage = '';

  constructor(
    private technicianService: TechnicianService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {

    this.offerId =
      this.route.snapshot.paramMap.get('offerId') || '';

    if (this.offerId) {
      this.loadNegotiations();
    }
  }

  loadNegotiations(): void {

    this.loading = true;
    this.errorMessage = '';

    this.technicianService
      .getNegotiations(this.offerId)
      .subscribe({

        next: (res) => {

          this.negotiations =
            res.negotiations || [];

          this.loading = false;

          this.cdr.markForCheck();

        },

        error: (err) => {

          console.error(
            'Error loading negotiations:',
            err
          );

          this.errorMessage =
            err.error?.message ||
            'Unable to load negotiations.';

          this.loading = false;

          this.cdr.markForCheck();

        }

      });
  }

  sendNegotiation(): void {

    if (this.price <= 0) {

      this.errorMessage =
        'Please enter a valid price.';

      return;
    }

    const data: ICreateNegotiationDto = {

      price: this.price,

      message:
        this.message.trim() || null

    };

    this.sending = true;

    this.errorMessage = '';

    this.technicianService
      .createNegotiation(
        this.offerId,
        data
      )
      .subscribe({

        next: () => {

          this.message = '';

          this.price = 0;

          this.sending = false;

          this.loadNegotiations();

        },

        error: (err) => {

          console.error(
            'Error sending negotiation:',
            err
          );

          this.errorMessage =
            err.error?.message ||
            'Unable to send negotiation.';

          this.sending = false;

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
        ? 'Resident'
        : 'You';

    }

    return (
      negotiation.senderId.name ||
      (
        negotiation.senderRole === 'RESIDENT'
          ? 'Resident'
          : 'You'
      )
    );
  }

  goBack(): void {

    this.router.navigate([
      '/technician/my-offers'
    ]);

  }
}