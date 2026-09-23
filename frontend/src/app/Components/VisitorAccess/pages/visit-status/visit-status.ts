import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { VisitorFlow } from '../../services/visitor-flow';

@Component({
  selector: 'app-visit-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './visit-status.html',
  styleUrl: './visit-status.css'
})
export class VisitStatus implements OnInit {

  visitorName = '';
  visitorEmail = '';

  residentName = '';

  building = '';
  unit = '';

  visitDate = '';
  startTime = '';

  purpose = '';

  requestId = '';

  currentStatus = '';

  steps = [
    {
      title: 'Request Submitted',
      description: 'Your visitor request has been submitted successfully.',
      state: 'completed',
      symbol: '✓'
    },
    {
      title: 'Email Verified',
      description: 'The visitor email address has been verified.',
      state: 'completed',
      symbol: '✓'
    },
    {
      title: 'Pending Approval',
      description: 'Your request was waiting for resident approval.',
      state: 'upcoming',
      symbol: '3'
    },
    {
      title: 'Approved',
      description: 'The visit request has been approved.',
      state: 'upcoming',
      symbol: '4'
    },
    {
      title: 'QR Generated',
      description: 'Your visitor QR pass is ready to use.',
      state: 'upcoming',
      symbol: '5'
    },
    {
      title: 'Checked In',
      description: 'Security will complete this step when you arrive.',
      state: 'upcoming',
      symbol: '6'
    },
    {
      title: 'Checked Out',
      description: 'This step will be completed when your visit ends.',
      state: 'upcoming',
      symbol: '7'
    }
  ];

  constructor(
    private router: Router,
    private visitorFlow: VisitorFlow
  ) {}

  ngOnInit(): void {
    this.loadVisitData();
  }

  loadVisitData(): void {
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

    this.currentStatus = visit.visitStatus;

    this.updateSteps();
  }

  updateSteps(): void {
    const visit = this.visitorFlow.getVisit();

    const statusOrder = [
      'Pending Approval',
      'Approved',
      'QR Generated',
      'Checked In',
      'Checked Out'
    ];

    const currentIndex = statusOrder.indexOf(visit.visitStatus);

    this.steps[2].state =
      currentIndex >= 0 ? 'completed' : 'upcoming';

    this.steps[3].state =
      currentIndex >= 1 ? 'completed' : 'upcoming';

    this.steps[4].state =
      currentIndex >= 2 ? 'active' : 'upcoming';

    this.steps[5].state =
      currentIndex >= 3 ? 'active' : 'upcoming';

    this.steps[6].state =
      currentIndex >= 4 ? 'active' : 'upcoming';

    if (visit.visitStatus === 'Pending Approval') {
      this.steps[2].state = 'active';
    }

    if (visit.visitStatus === 'Approved') {
      this.steps[3].state = 'active';
      this.steps[4].state = 'upcoming';
    }

    if (visit.visitStatus === 'Checked In') {
      this.steps[4].state = 'completed';
      this.steps[5].state = 'active';
    }

    if (visit.visitStatus === 'Checked Out') {
      this.steps[4].state = 'completed';
      this.steps[5].state = 'completed';
      this.steps[6].state = 'active';
    }
  }

  viewQrPass(): void {
    const visit = this.visitorFlow.getVisit();

    if (visit.visitStatus !== 'QR Generated') {
      return;
    }

    this.router.navigate(['/qr-code-display']);
  }

  backToRequest(): void {
    this.router.navigate(['/visitor-request-status']);
  }
}