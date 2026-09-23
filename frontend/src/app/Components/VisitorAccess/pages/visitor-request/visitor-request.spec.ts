import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { VisitorRequest } from './visitor-request';

describe('VisitorRequest', () => {
  let component: VisitorRequest;
  let fixture: ComponentFixture<VisitorRequest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisitorRequest],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(VisitorRequest);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
