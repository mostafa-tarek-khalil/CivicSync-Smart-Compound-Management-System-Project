import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SecurityDashboard } from './security-dashboard';

/** Blank route target so component navigations resolve during tests. */
@Component({ selector: 'app-test-blank', template: '' })
class TestBlankComponent {}

describe('SecurityDashboard', () => {
  let component: SecurityDashboard;
  let fixture: ComponentFixture<SecurityDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SecurityDashboard],
      providers: [
        provideRouter([{ path: '**', component: TestBlankComponent }]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SecurityDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
