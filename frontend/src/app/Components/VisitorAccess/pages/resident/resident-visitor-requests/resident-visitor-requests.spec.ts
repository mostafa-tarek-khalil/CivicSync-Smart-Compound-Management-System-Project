import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ResidentVisitorRequests } from './resident-visitor-requests';

describe('ResidentVisitorRequests', () => {
  let component: ResidentVisitorRequests;
  let fixture: ComponentFixture<ResidentVisitorRequests>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResidentVisitorRequests],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ResidentVisitorRequests);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});