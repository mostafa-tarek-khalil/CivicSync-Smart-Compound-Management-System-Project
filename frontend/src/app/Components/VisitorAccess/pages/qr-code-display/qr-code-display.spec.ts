import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { QrCodeDisplay } from './qr-code-display';

describe('QrCodeDisplay', () => {
  let component: QrCodeDisplay;
  let fixture: ComponentFixture<QrCodeDisplay>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrCodeDisplay],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(QrCodeDisplay);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
