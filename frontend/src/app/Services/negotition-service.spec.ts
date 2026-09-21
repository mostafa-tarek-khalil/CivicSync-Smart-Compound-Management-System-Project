import { TestBed } from '@angular/core/testing';

import { NegotitionService } from './negotition-service';

describe('NegotitionService', () => {
  let service: NegotitionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NegotitionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
