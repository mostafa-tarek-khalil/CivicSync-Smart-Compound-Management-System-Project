import { Component } from '@angular/core';
﻿import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AssignedJobsComponent } from './tech-jobs';

/** Blank route target so component navigations resolve during tests. */
@Component({ selector: 'app-test-blank', template: '' })
class TestBlankComponent {}

describe('AssignedJobsComponent', () => {
  let component: AssignedJobsComponent;
  let fixture: ComponentFixture<AssignedJobsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignedJobsComponent],
      providers: [provideRouter([{ path: '**', component: TestBlankComponent }]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(AssignedJobsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
