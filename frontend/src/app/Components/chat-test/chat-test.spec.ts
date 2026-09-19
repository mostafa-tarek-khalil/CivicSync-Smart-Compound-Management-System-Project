import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatTest } from './chat-test';

describe('ChatTest', () => {
  let component: ChatTest;
  let fixture: ComponentFixture<ChatTest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatTest],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatTest);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
