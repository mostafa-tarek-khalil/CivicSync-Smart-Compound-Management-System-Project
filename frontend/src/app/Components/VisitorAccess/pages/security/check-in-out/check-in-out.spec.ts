import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CheckInOut } from './check-in-out';

/** Blank route target so component navigations resolve during tests. */
@Component({ selector: 'app-test-blank', template: '' })
class TestBlankComponent {}

describe('CheckInOut', () => {
  let component: CheckInOut;
  let fixture: ComponentFixture<CheckInOut>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckInOut],
      providers: [provideRouter([{ path: '**', component: TestBlankComponent }]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckInOut);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should create', async () => {
    await fixture.whenStable();
    expect(component).toBeTruthy();
    httpMock.match('**/security/visits');
  });

  it('opens in picker mode when no visit is selected, instead of redirecting away', async () => {
    await fixture.whenStable();

    expect(component.pickerMode).toBe(true);
    expect(component.visitId).toBe('');

    // The picker loads the security visit list rather than bouncing the user
    // back to the visitor list.
    const req = httpMock.expectOne('http://localhost:3000/api/visits/security/visits');
    req.flush({
      success: true,
      data: [
        { _id: 'v1', visitorName: 'Alice', status: 'APPROVED', visitDate: '2026-01-01', visitStartTime: '10:00' },
        { _id: 'v2', visitorName: 'Bob', status: 'CHECKED_IN', visitDate: '2026-01-01', visitStartTime: '11:00' },
        { _id: 'v3', visitorName: 'Carol', status: 'PENDING', visitDate: '2026-01-01', visitStartTime: '12:00' },
        { _id: 'v4', visitorName: 'Dave', status: 'CHECKED_OUT', visitDate: '2026-01-01', visitStartTime: '13:00' },
      ],
    });

    // Only the actionable visits survive: APPROVED -> check in, CHECKED_IN -> check out.
    expect(component.candidates.map(c => c.id)).toEqual(['v1', 'v2']);
    expect(component.candidates.map(c => c.action)).toEqual(['in', 'out']);
  });
});
