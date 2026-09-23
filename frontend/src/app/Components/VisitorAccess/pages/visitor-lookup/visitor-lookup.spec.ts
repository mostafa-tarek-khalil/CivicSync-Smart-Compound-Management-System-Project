import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { VisitorLookup } from './visitor-lookup';

describe('VisitorLookup', () => {
  let component: VisitorLookup;
  let fixture: ComponentFixture<VisitorLookup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisitorLookup],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(VisitorLookup);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});