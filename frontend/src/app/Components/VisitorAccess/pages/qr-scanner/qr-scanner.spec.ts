import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { QrScanner } from './qr-scanner';

describe('QrScanner', () => {
  let component: QrScanner;
  let fixture: ComponentFixture<QrScanner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrScanner],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(QrScanner);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
