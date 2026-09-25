import { TestBed } from '@angular/core/testing';

import { ChatSocket } from './chat-socket';

describe('ChatSocket', () => {
  let service: ChatSocket;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChatSocket);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
