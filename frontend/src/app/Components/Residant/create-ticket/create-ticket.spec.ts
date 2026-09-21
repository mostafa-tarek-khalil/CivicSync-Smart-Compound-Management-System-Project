import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateTicket } from './create-ticket';

describe('CreateTicket', () => {
  let component: CreateTicket;
  let fixture: ComponentFixture<CreateTicket>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateTicket],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateTicket);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
