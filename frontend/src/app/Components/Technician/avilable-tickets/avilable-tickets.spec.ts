import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvilableTickets } from './avilable-tickets';

describe('AvilableTickets', () => {
  let component: AvilableTickets;
  let fixture: ComponentFixture<AvilableTickets>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvilableTickets],
    }).compileComponents();

    fixture = TestBed.createComponent(AvilableTickets);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
