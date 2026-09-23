import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { RegisterDetailsPage } from './register-details-page';

describe('RegisterDetailsPage', () => {
  let component: RegisterDetailsPage;
  let fixture: ComponentFixture<RegisterDetailsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterDetailsPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterDetailsPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
