import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccessHistory } from './access-history';

describe('AccessHistory', () => {
  let component: AccessHistory;
  let fixture: ComponentFixture<AccessHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccessHistory],
    }).compileComponents();

    fixture = TestBed.createComponent(AccessHistory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
