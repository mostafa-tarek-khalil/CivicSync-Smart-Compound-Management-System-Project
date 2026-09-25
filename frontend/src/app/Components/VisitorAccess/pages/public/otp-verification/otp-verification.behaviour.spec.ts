import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { OtpVerification } from './otp-verification';
import { VisitorFlow } from '../../../services/visitor-flow';
import { VisitService } from '../../../../../Services/visit-service';

/** Blank route target so the component's redirect resolves during tests. */
@Component({ selector: 'app-test-blank', template: '' })
class TestBlankComponent {}

/**
 * Focused tests for the OTP screen's behaviour.
 *
 * They cover the things a browser pass cannot prove reliably: that the
 * processing phase is really entered (it used to be skipped entirely when the
 * API answered quickly), that the visible outcome mirrors the real API result,
 * that paste / arrow keys work, and that the guard only redirects when there is
 * genuinely no tracked visit.
 */
describe('OtpVerification', () => {
  let visitServiceMock: {
    verifyVisitorOtp: ReturnType<typeof vi.fn>;
    sendVisitorOtp: ReturnType<typeof vi.fn>;
  };

  const seedVisit = () => {
    TestBed.inject(VisitorFlow).trackVisit({
      requestId: 'visit-1',
      visitorEmail: 'visitor@example.com',
      visitorName: 'Visitor'
    });
  };

  const create = async () => {
    const fixture = TestBed.createComponent(OtpVerification);
    // Zoneless component: the DOM is not required. Creating the instance runs
    // the constructor (and its guard) without forcing a render pass, which would
    // assert under zoneless change detection.
    return fixture.componentInstance;
  };

  const boxes = () =>
    document.querySelectorAll<HTMLInputElement>('.otp-input');

  beforeEach(async () => {
    localStorage.clear();

    visitServiceMock = {
      verifyVisitorOtp: vi.fn(),
      sendVisitorOtp: vi.fn(() =>
        of({
          success: true,
          data: {
            visitId: 'visit-1',
            expiresAt: new Date(Date.now() + 300000).toISOString()
          }
        })
      )
    };

    await TestBed.configureTestingModule({
      imports: [OtpVerification],
      providers: [
        provideRouter([{ path: '**', component: TestBlankComponent }]),
        { provide: VisitService, useValue: visitServiceMock }
      ]
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    document.body.innerHTML = '';
  });

  // ---------------------------------------------------------------- guard

  it('redirects when no visit is tracked, and does not when there is one', async () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    create();
    expect(navigate).toHaveBeenCalledWith(['/visitor-request']);

    navigate.mockClear();
    seedVisit();
    create();
    expect(navigate).not.toHaveBeenCalledWith(['/visitor-request']);
  });

  it('shows the tracked email and starts an expiry countdown', async () => {
    seedVisit();
    const component = await create();

    expect(component.email).toBe('visitor@example.com');
    expect(component.expiryLabel).toMatch(/^\d+:\d{2}$/);
    expect(component.isExpired).toBe(false);
  });

  // ------------------------------------------------------------ input UX

  describe('inputs', () => {
    beforeEach(() => {
      for (let i = 0; i < 6; i++) {
        const input = document.createElement('input');
        input.className = 'otp-input';
        document.body.appendChild(input);
      }
    });

    it('accepts digits, rejects letters, and advances on entry', async () => {
      seedVisit();
      const component = await create();

      boxes()[0].value = 'a';
      component.onInput({ target: boxes()[0] } as unknown as Event, 0);
      expect(component.otp[0]).toBe('');

      boxes()[0].value = '7';
      component.onInput({ target: boxes()[0] } as unknown as Event, 0);
      expect(component.otp[0]).toBe('7');
      expect(document.activeElement).toBe(boxes()[1]);
    });

    it('spreads a pasted code across every box', async () => {
      seedVisit();
      const component = await create();

      const event = {
        clipboardData: { getData: () => '24-68 13' },
        preventDefault: vi.fn()
      } as unknown as ClipboardEvent;

      component.onPaste(event, 0);

      expect(component.otp.join('')).toBe('246813');
      expect(boxes()[5].value).toBe('3');
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('ignores a paste with no digits, and clears a stale error otherwise', async () => {
      seedVisit();
      const component = await create();

      const empty = {
        clipboardData: { getData: () => 'abc' },
        preventDefault: vi.fn()
      } as unknown as ClipboardEvent;

      component.onPaste(empty, 0);
      expect(component.otp.join('')).toBe('');
      expect(empty.preventDefault).not.toHaveBeenCalled();

      component.status = 'error';
      component.errorMessage = 'nope';
      component.onPaste(
        {
          clipboardData: { getData: () => '111111' },
          preventDefault: vi.fn()
        } as unknown as ClipboardEvent,
        0
      );
      expect(component.status).toBe('default');
      expect(component.errorMessage).toBe('');
    });

    it('spreads a multi-digit value arriving through onInput (autofill)', async () => {
      seedVisit();
      const component = await create();

      boxes()[0].value = '987654';
      component.onInput({ target: boxes()[0] } as unknown as Event, 0);

      expect(component.otp.join('')).toBe('987654');
    });

    it('moves focus with the arrow keys', async () => {
      seedVisit();
      const component = await create();

      boxes()[2].focus();
      component.onArrow(
        { key: 'ArrowLeft', preventDefault: vi.fn() } as unknown as KeyboardEvent,
        2
      );
      expect(document.activeElement).toBe(boxes()[1]);

      component.onArrow(
        { key: 'ArrowRight', preventDefault: vi.fn() } as unknown as KeyboardEvent,
        1
      );
      expect(document.activeElement).toBe(boxes()[2]);
    });

    it('clears the current box and steps back on backspace', async () => {
      seedVisit();
      const component = await create();

      // A filled box is emptied in place...
      component.otp[3] = '5';
      component.onKeyDown(
        { key: 'Backspace', target: { value: '5' }, preventDefault: vi.fn() } as unknown as KeyboardEvent,
        3
      );
      expect(component.otp[3]).toBe('');

      // ...and an empty box clears the previous digit.
      component.otp[2] = '4';
      const preventDefault = vi.fn();
      component.onKeyDown(
        { key: 'Backspace', target: { value: '' }, preventDefault } as unknown as KeyboardEvent,
        3
      );
      expect(component.otp[2]).toBe('');
      expect(preventDefault).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------- verification

  describe('verification', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('enters the processing phase while the request is in flight', async () => {
      seedVisit();
      const component = await create();
      component.otp = ['1', '2', '3', '4', '5', '6'];

      visitServiceMock.verifyVisitorOtp.mockReturnValue(
        new Observable(() => () => undefined)
      );

      component.verifyOtp();

      expect(component.isLoading).toBe(true);
      expect(component.status).toBe('submitting');

      vi.advanceTimersByTime(900);
      expect(component.status).toBe('processing');
    });

    it('reports success only when the API accepts the code', async () => {
      seedVisit();
      const component = await create();
      component.otp = ['1', '2', '3', '4', '5', '6'];

      visitServiceMock.verifyVisitorOtp.mockReturnValue(
        of({ success: true, data: { status: 'PENDING' } })
      );

      component.verifyOtp();
      vi.advanceTimersByTime(1200);

      expect(component.status).toBe('success');
      expect(component.isLoading).toBe(false);
    });

    it('shows the backend error, clears the boxes, and counts the attempt', async () => {
      seedVisit();
      const component = await create();
      component.otp = ['9', '9', '9', '9', '9', '9'];

      visitServiceMock.verifyVisitorOtp.mockReturnValue(
        throwError(() => ({ error: { message: 'Invalid OTP' } }))
      );

      component.verifyOtp();
      vi.advanceTimersByTime(1200);

      expect(component.status).toBe('error');
      expect(component.errorMessage).toBe('Invalid OTP');
      expect(component.otp.join('')).toBe('');
      expect(component.attemptsLeft).toBe(4);
    });

    it('warns the visitor only when few attempts remain', async () => {
      seedVisit();
      const component = await create();

      component.attemptsUsed.set(1);
      expect(component.showAttemptsWarning).toBe(false);

      component.attemptsUsed.set(3);
      expect(component.showAttemptsWarning).toBe(true);
    });

    it('refuses an incomplete or expired code without calling the API', async () => {
      seedVisit();
      const component = await create();

      component.otp = ['1', '2', '3', '', '', ''];
      component.verifyOtp();
      expect(visitServiceMock.verifyVisitorOtp).not.toHaveBeenCalled();

      component.otp = ['1', '2', '3', '4', '5', '6'];
      component.secondsRemaining.set(0);
      component.verifyOtp();
      expect(component.errorMessage).toContain('expired');
      expect(visitServiceMock.verifyVisitorOtp).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------- resend

  describe('resend', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('restarts the countdown from the backend expiry and starts a cooldown', async () => {
      seedVisit();
      const component = await create();

      visitServiceMock.sendVisitorOtp.mockReturnValue(
        of({
          success: true,
          data: {
            visitId: 'visit-1',
            expiresAt: new Date(Date.now() + 120000).toISOString()
          }
        })
      );

      component.resendOtp();

      expect(component.secondsRemaining()).toBeGreaterThan(100);
      expect(component.secondsRemaining()).toBeLessThanOrEqual(120);
      expect(component.resendCooldown()).toBeGreaterThan(0);
    });

    it('ignores a resend while the cooldown runs, and reports failures', async () => {
      seedVisit();
      const component = await create();

      component.resendCooldown.set(20);
      component.secondsRemaining.set(100);
      component.resendOtp();
      expect(visitServiceMock.sendVisitorOtp).not.toHaveBeenCalled();

      component.resendCooldown.set(0);
      visitServiceMock.sendVisitorOtp.mockReturnValue(
        throwError(() => ({ error: { message: 'Too many requests' } }))
      );
      component.resendOtp();
      expect(component.errorMessage).toBe('Too many requests');
      expect(component.isLoading).toBe(false);
    });
  });
});