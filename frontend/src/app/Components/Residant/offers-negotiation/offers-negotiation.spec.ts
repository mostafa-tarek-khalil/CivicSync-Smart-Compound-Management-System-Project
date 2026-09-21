import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OffersNegotiation } from './offers-negotiation';

describe('OffersNegotiation', () => {
  let component: OffersNegotiation;
  let fixture: ComponentFixture<OffersNegotiation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OffersNegotiation],
    }).compileComponents();

    fixture = TestBed.createComponent(OffersNegotiation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
