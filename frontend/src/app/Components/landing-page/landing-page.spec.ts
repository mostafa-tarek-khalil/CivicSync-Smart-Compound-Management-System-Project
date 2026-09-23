import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LandingPage } from './landing-page';

describe('LandingPage', () => {
  let component: LandingPage;
  let fixture: ComponentFixture<LandingPage>;

  beforeAll(() => {
    // jsdom does not implement IntersectionObserver; the component uses it
    // for scroll tracking, which is irrelevant to these unit tests.
    if (!('IntersectionObserver' in globalThis)) {
      (globalThis as any).IntersectionObserver = class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      };
    }
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
