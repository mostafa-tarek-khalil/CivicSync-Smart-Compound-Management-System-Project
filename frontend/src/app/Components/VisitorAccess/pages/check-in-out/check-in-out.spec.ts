import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CheckInOut } from './check-in-out';

describe('CheckInOut', () => {
  let component: CheckInOut;
  let fixture: ComponentFixture<CheckInOut>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckInOut],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckInOut);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
