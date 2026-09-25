import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { VisitorRequestStatus } from './visitor-request-status';

/** Blank route target so component navigations resolve during tests. */
@Component({ selector: 'app-test-blank', template: '' })
class TestBlankComponent {}

describe('VisitorRequestStatus', () => {
  let component: VisitorRequestStatus;
  let fixture: ComponentFixture<VisitorRequestStatus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisitorRequestStatus],
      providers: [
        provideRouter([{ path: '**', component: TestBlankComponent }]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VisitorRequestStatus);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
