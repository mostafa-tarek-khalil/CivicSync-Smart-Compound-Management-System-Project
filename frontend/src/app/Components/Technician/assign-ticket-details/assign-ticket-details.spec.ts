import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignTicketDetails } from './assign-ticket-details';

describe('AssignTicketDetails', () => {
  let component: AssignTicketDetails;
  let fixture: ComponentFixture<AssignTicketDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignTicketDetails],
    }).compileComponents();

    fixture = TestBed.createComponent(AssignTicketDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
