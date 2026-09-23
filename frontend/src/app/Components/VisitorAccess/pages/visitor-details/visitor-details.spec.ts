import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { VisitorDetails } from './visitor-details';

describe('VisitorDetails', () => {
  let component: VisitorDetails;
  let fixture: ComponentFixture<VisitorDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisitorDetails],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(VisitorDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
