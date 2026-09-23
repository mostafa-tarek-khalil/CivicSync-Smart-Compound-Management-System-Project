import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvilableTicketDetails } from './avilable-ticket-details';

describe('AvilableTicketDetails', () => {
  let component: AvilableTicketDetails;
  let fixture: ComponentFixture<AvilableTicketDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvilableTicketDetails],
    }).compileComponents();

    fixture = TestBed.createComponent(AvilableTicketDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
