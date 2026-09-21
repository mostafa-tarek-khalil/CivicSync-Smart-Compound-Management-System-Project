import { TestBed } from '@angular/core/testing';

import { MaintenanceTicket } from './maintenance-ticket';

describe('MaintenanceTicket', () => {
  let service: MaintenanceTicket;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MaintenanceTicket);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
