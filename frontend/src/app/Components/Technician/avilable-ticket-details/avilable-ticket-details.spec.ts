import { Component } from '@angular/core';
﻿import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TechnicianTicketDetailsComponent } from './avilable-ticket-details';

/** Blank route target so component navigations resolve during tests. */
@Component({ selector: 'app-test-blank', template: '' })
class TestBlankComponent {}

describe('TechnicianTicketDetailsComponent', () => {
  let component: TechnicianTicketDetailsComponent;
  let fixture: ComponentFixture<TechnicianTicketDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TechnicianTicketDetailsComponent],
      providers: [provideRouter([{ path: '**', component: TestBlankComponent }]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(TechnicianTicketDetailsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
