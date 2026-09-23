
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { VisitorFlow } from '../../services/visitor-flow';
import { VisitService } from '../../../../Services/visit-service';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-qr-code-display',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './qr-code-display.html',
  styleUrl: './qr-code-display.css'
})
export class QrCodeDisplay implements OnInit {

  // =========================
  // VISITOR DATA
  // =========================

  visitorName = '';
  visitorEmail = '';

  residentName = '';

  building = '';
  unit = '';

  visitDate = '';
  startTime = '';
  purpose = '';

  requestId = '';

  status = '';

  expiresAt = '';
  qrImage = '';
  qrToken = '';
  loading = false;
  errorMessage = '';


  constructor(
    private router: Router,
    private visitorFlow: VisitorFlow,
    private visitService: VisitService
  ) {

    // Get shared mock visit data
    const visit = this.visitorFlow.getVisit();

    this.visitorName = visit.visitorName;
    this.visitorEmail = visit.visitorEmail;

    this.residentName = visit.residentName;

    this.building = visit.building;
    this.unit = visit.unit;

    this.visitDate = visit.visitDate;
    this.startTime = visit.startTime;
    this.purpose = visit.purpose;

    this.requestId = visit.requestId;

    this.status = visit.visitStatus;

    this.expiresAt = visit.qrExpiration;
  }

  ngOnInit(): void {
    const visit = this.visitorFlow.getVisit();
    if (!visit.requestId || !visit.visitorEmail || visit.visitStatus !== 'QR Generated') {
      this.router.navigate(['/visitor-request-status']);
      return;
    }
    this.loading = true;
    this.visitService.getVisitorQr(visit.requestId, visit.visitorEmail).subscribe({
      next: response => {
        this.qrToken = response.data.qrToken;
        this.expiresAt = response.data.expiresAt;
        this.visitorFlow.updateVisit({ qrToken: this.qrToken, qrExpiration: this.expiresAt });
        QRCode.toDataURL(this.qrToken, { errorCorrectionLevel: 'M', margin: 2, width: 280 })
          .then(image => { this.qrImage = image; this.loading = false; })
          .catch(() => { this.errorMessage = 'Could not render the visitor pass.'; this.loading = false; });
      },
      error: error => {
        this.errorMessage = error?.error?.message || 'The visitor QR pass is not available.';
        this.loading = false;
      }
    });
  }


  // =========================
  // VIEW VISIT STATUS
  // =========================

  viewVisitStatus(): void {

    this.router.navigate([
      '/visit-status'
    ]);

  }


  // =========================
  // BACK
  // =========================

  goBack(): void {

    this.router.navigate(['/visitor-request-status']);

  }

  get initials(): string {
    return (this.visitorName || 'Visitor')
      .split(' ')
      .map(part => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

}
