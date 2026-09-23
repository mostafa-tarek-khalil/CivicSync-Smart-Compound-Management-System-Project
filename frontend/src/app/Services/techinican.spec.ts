import { TestBed } from '@angular/core/testing';

import { Techinican } from './techinican';

describe('Techinican', () => {
  let service: Techinican;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Techinican);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
