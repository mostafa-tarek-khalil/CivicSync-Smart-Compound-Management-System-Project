import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { VisitorFlow } from '../../../services/visitor-flow';
import { VisitService, VisitUnit } from '../../../../../Services/visit-service';

@Component({
  selector: 'app-visitor-request',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './visitor-request.html',
  styleUrl: './visitor-request.css'
})
export class VisitorRequest implements OnInit {

  currentStep = 1;

  visitor = {
    fullName: '',
    phone: '',
    email: ''
  };

  visit = {
    building: '',
    unit: '',
    date: '',
    time: '',
    purpose: ''
  };

  units: VisitUnit[] = [];
  buildings: Array<{ _id: string; name: string; buildingNumber: number }> = [];
  loadingUnits = false;
  submitting = false;
  errorMessage = '';
  minDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  constructor(
    private router: Router,
    private visitorFlow: VisitorFlow,
    private visitService: VisitService
  ) {}

  ngOnInit(): void {
    this.loadingUnits = true;
    this.visitService.getVisitorUnits().subscribe({
      next: response => {
        this.units = response.data;
        const unique = new Map<string, VisitUnit['buildingId']>();
        for (const unit of this.units) unique.set(unit.buildingId._id, unit.buildingId);
        this.buildings = [...unique.values()].sort((a, b) => a.buildingNumber - b.buildingNumber);
        this.loadingUnits = false;
      },
      error: error => {
        this.errorMessage = error?.error?.message || 'Could not load occupied units. Please try again.';
        this.loadingUnits = false;
      }
    });
  }

  get filteredUnits(): VisitUnit[] {
    return this.units.filter(unit => unit.buildingId._id === this.visit.building);
  }

  onBuildingChange(): void {
    this.visit.unit = '';

    this.errorMessage = '';
  }

  goToStep2(): void {
    if (
      !this.visitor.fullName.trim() ||
      !this.visitor.phone.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.visitor.email.trim())
    ) {
      this.errorMessage = 'Enter your name, phone number, and a valid email address.';
      return;
    }

    this.errorMessage = '';
    this.currentStep = 2;
  }

  goToStep3(): void {
    if (
      !this.visit.building ||
      !this.visit.unit ||
      !this.visit.date ||
      !this.visit.time ||
      !this.visit.purpose.trim()
    ) {
      this.errorMessage = 'Complete all visit details before continuing.';
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const visitDate = new Date(`${this.visit.date}T00:00:00`);
    if (Number.isNaN(visitDate.getTime()) || visitDate < today) {
      this.errorMessage = 'Choose today or a future date for the visit.';
      return;
    }

    if (this.submitting) return;
    this.submitting = true;
    this.errorMessage = '';

    const building = this.buildings.find(item => item._id === this.visit.building);
    const unit = this.filteredUnits.find(item => item._id === this.visit.unit);
    if (!building || !unit) {
      this.submitting = false;
      this.errorMessage = 'Select a valid occupied unit.';
      return;
    }

    this.visitService.createVisitorRequest({
      visitorName: this.visitor.fullName.trim(),
      visitorEmail: this.visitor.email.trim().toLowerCase(),
      visitorPhone: this.visitor.phone.trim(),
      buildingId: building._id,
      unitId: unit._id,
      visitDate: this.visit.date,
      visitStartTime: this.visit.time,
      purpose: this.visit.purpose.trim()
    }).subscribe({
      next: response => {
        this.visitorFlow.trackVisit({
          requestId: response.data.visitId,
          visitorEmail: this.visitor.email.trim().toLowerCase(),
          visitorName: this.visitor.fullName.trim(),
          visitorPhone: this.visitor.phone.trim(),
          building: building.name,
          buildingId: building._id,
          unit: String(unit.unitNumber),
          unitId: unit._id,
          visitDate: this.visit.date,
          startTime: this.visit.time,
          purpose: this.visit.purpose.trim()
        });

        this.visitService.sendVisitorOtp(response.data.visitId).subscribe({
          next: () => this.router.navigate(['/otp-verification']),
          error: error => {
            this.submitting = false;
            this.errorMessage = error?.error?.message || 'Request created, but the OTP could not be sent. Retry from the verification page.';
            this.router.navigate(['/otp-verification']);
          }
        });
      },
      error: error => {
        this.submitting = false;
        this.errorMessage = error?.error?.message || 'Could not submit the visit request.';
      }
    });
  }

  goBack(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }
}
