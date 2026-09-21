import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TicketDetails } from './ticket-details';

describe('TicketDetails', () => {
  let component: TicketDetails;
  let fixture: ComponentFixture<TicketDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketDetails],
    }).compileComponents();

    fixture = TestBed.createComponent(TicketDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
