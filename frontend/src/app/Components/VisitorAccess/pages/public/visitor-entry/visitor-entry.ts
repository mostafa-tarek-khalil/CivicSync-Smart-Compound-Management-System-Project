import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { VisitorFlow } from '../../../services/visitor-flow';

@Component({
  selector: 'app-visitor-entry',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './visitor-entry.html',
  styleUrl: './visitor-entry.css'
})
export class VisitorEntry {
  constructor(
    private router: Router,
    private visitorFlow: VisitorFlow
  ) { }

  /** True when this browser already has an in-progress visit saved. */
  get hasSavedVisit(): boolean {
    return this.visitorFlow.hasVisit();
  }

  get savedVisitorName(): string {
    return this.visitorFlow.getVisit().visitorName;
  }

  startRequest(): void {
    this.router.navigate(['/visitor-request']);
  }

  resumeSaved(): void {
    const visit = this.visitorFlow.getVisit();
    if (!visit.requestId) {
      this.router.navigate(['/visitor-lookup']);
      return;
    }

    if (visit.status === 'QR_GENERATED') {
      this.router.navigate(['/qr-code-display']);
      return;
    }

    this.router.navigate(['/visitor-request-status']);
  }

  trackRequest(): void {
    this.router.navigate(['/visitor-lookup']);
  }
}