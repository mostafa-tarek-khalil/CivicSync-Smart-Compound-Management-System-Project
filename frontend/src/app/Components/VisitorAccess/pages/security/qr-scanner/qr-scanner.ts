import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import jsQR from 'jsqr';
import { VisitService, VisitRecord } from '../../../../../Services/visit-service';

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

  /**
   * Scan state lives in signals.
   *
   * This app runs with `provideZonelessChangeDetection()`, so nothing patches
   * `requestAnimationFrame` / promise callbacks. A plain field mutated from the
   * frame loop or the HTTP callback would only repaint when some OTHER event
   * happened to trigger a render — the "spinner stays until you click twice"
   * bug. Signals notify the scheduler directly, so the UI updates itself.
   */
  readonly scanState = signal<ScanState>('ready');
  readonly manualQrToken = signal('');
  readonly errorMessage = signal('');
  readonly verifying = signal(false);
  readonly visitor = signal({
    name: '',
    email: '',
    phone: '',
    resident: '',
    date: '',
    time: '',
    purpose: ''
  });

  private mediaStream?: MediaStream;
  private detector?: { detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>> };
  private canvas?: HTMLCanvasElement;
  private scanning = false;
  private lastVisitId = '';

  constructor(
    private router: Router,
    private visitService: VisitService,
    private cdr: ChangeDetectorRef
  ) {}

  /** Two-way binding helper for the manual token input. */
  setManualToken(value: string): void {
    this.manualQrToken.set(value);
  }

  async startScan(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.errorMessage.set(
        'Camera scanning is not supported here. Enter the pass code manually.'
      );
      return;
    }

    try {
      this.errorMessage.set('');
      this.scanState.set('scanning');

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
      this.scanState.set('ready');
      this.errorMessage.set(error?.message || 'Camera permission was denied.');
    }
  }

  async verifyToken(token = this.manualQrToken()): Promise<void> {
    const qrToken = token.trim();

    if (!qrToken || this.verifying()) return;

    this.verifying.set(true);
    this.errorMessage.set('');
    this.scanState.set('scanning');

    this.visitService.scanQr(qrToken).subscribe({
      next: response => {
        const visitId = response.data.visitId || response.data._id;
        this.lastVisitId = visitId;

        this.visitService.getSecurityVisit(visitId).subscribe({
          next: details => {
            this.setVisitor(details.data);
            // The scan result belongs to the security operator, not to the
            // visitor's own tracked visit, so we deliberately do not touch
            // VisitorFlow here.
            this.scanState.set('valid');
            this.manualQrToken.set('');
            this.verifying.set(false);
          },
          error: error => {
            this.scanState.set('invalid');
            this.errorMessage.set(
              error?.error?.message || 'Could not load the verified visit details.'
            );
            this.verifying.set(false);
          }
        });
      },
      error: error => {
        const message =
          error?.error?.message || 'The visitor pass could not be verified.';
        const normalized = message.toLowerCase();

        this.scanState.set(
          normalized.includes('expir')
            ? 'expired'
            : normalized.includes('already') || normalized.includes('used')
            ? 'used'
            : 'invalid'
        );

        this.errorMessage.set(message);
        this.verifying.set(false);
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
      this.errorMessage.set(
        'Could not read the QR code. Keep it inside the camera frame.'
      );
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

    this.visitor.set({
      name: visit.visitorName,
      email: visit.visitorEmail,
      phone: visit.visitorPhone || '',
      resident: resident?.name || 'Resident',
      date: visit.visitDate,
      time: visit.visitStartTime,
      purpose: visit.purpose || ''
    });

    // NOTE: the scanner intentionally does NOT write into the visitor's
    // tracked-visit store. Security is operating on someone else's visit; a
    // scan must not mutate the visitor's own session state.
  }

  resetScanner(): void {
    this.stopCamera();
    this.scanState.set('ready');
    this.errorMessage.set('');
    this.verifying.set(false);
    this.manualQrToken.set('');
  }

  private stopCamera(): void {
    this.scanning = false;
    this.mediaStream?.getTracks().forEach(track => track.stop());
    this.mediaStream = undefined;
  }

  viewVisitorDetails(): void {
    this.router.navigate(['/security/visitors/details'], {
      queryParams: this.lastVisitId ? { visitId: this.lastVisitId } : {}
    });
  }

  goBack(): void {
    this.stopCamera();
    this.router.navigate(['/security/visitors']);
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }
}
