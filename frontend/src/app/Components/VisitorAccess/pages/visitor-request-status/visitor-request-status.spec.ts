import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VisitorRequestStatus } from './visitor-request-status';

describe('VisitorRequestStatus', () => {
  let component: VisitorRequestStatus;
  let fixture: ComponentFixture<VisitorRequestStatus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisitorRequestStatus],
    }).compileComponents();

    fixture = TestBed.createComponent(VisitorRequestStatus);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
