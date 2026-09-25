import { Component } from '@angular/core';
﻿import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TechnicianReviewsComponent } from './techreviews';

/** Blank route target so component navigations resolve during tests. */
@Component({ selector: 'app-test-blank', template: '' })
class TestBlankComponent {}

describe('TechnicianReviewsComponent', () => {
  let component: TechnicianReviewsComponent;
  let fixture: ComponentFixture<TechnicianReviewsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TechnicianReviewsComponent],
      providers: [provideRouter([{ path: '**', component: TestBlankComponent }]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(TechnicianReviewsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
