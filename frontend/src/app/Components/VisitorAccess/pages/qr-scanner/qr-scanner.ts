import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import jsQR from 'jsqr';
import { VisitService, VisitRecord } from '../../../../Services/visit-service';
import { VisitorFlow } from '../../services/visitor-flow';

type ScanState = 'ready' | 'scanning' | 'valid' | 'invalid' | 'expired' | 'used';

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './qr-scanner.html',
  styleUrl: './qr-scanner.css'
})
export class QrScanner implements OnDestroy {
  @ViewChild('cameraVideo') cameraVideo?: ElementRef<HTMLVideoElement>;

  scanState: ScanState = 'ready';
  manualQrToken = '';
  errorMessage = '';
  visitor = { name: '', email: '', phone: '', resident: '', date: '', time: '', purpose: '' };
  private mediaStream?: MediaStream;
  private detector?: { detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>> };
  private canvas?: HTMLCanvasElement;
  private scanning = false;
  private verifying = false;
  private lastVisitId = '';

  constructor(
    private router: Router,
    private visitService: VisitService,
    private visitorFlow: VisitorFlow
  ) {}

  async startScan(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.errorMessage = 'Camera scanning is not supported here. Enter the pass code manually.';
      return;
    }

    try {
      this.errorMessage = '';
      this.scanState = 'scanning';

      // BarcodeDetector is used only when the browser actually supports it
      // (mainly Android Chrome). On desktop / iOS we fall back to jsQR which
      // decodes frames drawn onto a canvas and works everywhere.
      const Detector = (window as any)['BarcodeDetector'];
      if (Detector) {
        try {
          this.detector = new Detector({ formats: ['qr_code'] });
        } catch {
          this.detector = undefined;
        }
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }, audio: false
      });
      const video = this.cameraVideo?.nativeElement;
      if (!video) throw new Error('Camera preview is unavailable.');
      video.srcObject = this.mediaStream;
      video.setAttribute('playsinline', 'true');
      await video.play();
      this.scanning = true;
      void this.scanFrame();
    } catch (error: any) {
      this.stopCamera();
      this.scanState = 'ready';
      this.errorMessage = error?.message || 'Camera permission was denied.';
    }
  }

  async verifyToken(token = this.manualQrToken): Promise<void> {
    const qrToken = token.trim();
    if (!qrToken || this.verifying) return;
    this.verifying = true;
    this.errorMessage = '';
    this.scanState = 'scanning';
    this.visitService.scanQr(qrToken).subscribe({
      next: response => {
        const visitId = response.data.visitId || response.data._id;
        this.lastVisitId = visitId;
        this.visitService.getSecurityVisit(visitId).subscribe({
          next: details => {
            this.setVisitor(details.data);
            this.visitorFlow.updateVisit({ requestId: visitId });
            this.scanState = 'valid';
            this.manualQrToken = '';
            this.verifying = false;
          },
          error: error => {
            this.scanState = 'invalid';
            this.errorMessage = error?.error?.message || 'Could not load the verified visit details.';
            this.verifying = false;
          }
        });
      },
      error: error => {
        const message = error?.error?.message || 'The visitor pass could not be verified.';
        const normalized = message.toLowerCase();
        this.scanState = normalized.includes('expir') ? 'expired'
          : normalized.includes('already') || normalized.includes('used') ? 'used' : 'invalid';
        this.errorMessage = message;
        this.verifying = false;
      }
    });
  }

  private async scanFrame(): Promise<void> {
    const video = this.cameraVideo?.nativeElement;
    if (!this.scanning || !video) return;

    try {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
        let token = '';

        // 1) Native detector (fastest) when available
        if (this.detector) {
          try {
            const results = await this.detector.detect(video);
            token = results[0]?.rawValue || '';
          } catch {
            // Detector unsupported/failed at runtime — rely on jsQR below.
          }
        }

        // 2) jsQR fallback: draw the current frame onto a canvas and decode.
        if (!token) {
          token = this.decodeWithJsQr(video);
        }

        if (token) {
          this.stopCamera();
          await this.verifyToken(token);
          return;
        }
      }
    } catch {
      this.errorMessage = 'Could not read the QR code. Keep it inside the camera frame.';
    }

    if (this.scanning) requestAnimationFrame(() => void this.scanFrame());
  }

  private decodeWithJsQr(video: HTMLVideoElement): string {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
    }
    const canvas = this.canvas;
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return '';

    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return '';

    context.drawImage(video, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height);
    const result = jsQR(imageData.data, width, height, { inversionAttempts: 'dontInvert' });
    return result?.data || '';
  }

  private setVisitor(visit: VisitRecord): void {
    const resident = typeof visit.residentId === 'object' ? visit.residentId : null;
    this.visitor = {
      name: visit.visitorName,
      email: visit.visitorEmail,
      phone: visit.visitorPhone || '',
      resident: resident?.name || 'Resident',
      date: visit.visitDate,
      time: visit.visitStartTime,
      purpose: visit.purpose || ''
    };
    this.visitorFlow.updateVisit({
      requestId: visit._id,
      visitorName: visit.visitorName,
      visitorEmail: visit.visitorEmail,
      visitorPhone: visit.visitorPhone || '',
      residentName: resident?.name || '',
      visitDate: visit.visitDate,
      startTime: visit.visitStartTime,
      purpose: visit.purpose || '',
      visitStatus: 'QR Generated',
      qrStatus: 'Valid'
    });
  }

  resetScanner(): void {
    this.stopCamera();
    this.scanState = 'ready';
    this.errorMessage = '';
  }

  private stopCamera(): void {
    this.scanning = false;
    this.mediaStream?.getTracks().forEach(track => track.stop());
    this.mediaStream = undefined;
  }

  viewVisitorDetails(): void {
    this.router.navigate(['/visitor-details'], {
      queryParams: this.lastVisitId ? { visitId: this.lastVisitId } : {}
    });
  }

  goBack(): void {
    this.stopCamera();
    this.router.navigate(['/security-dashboard']);
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }
}
