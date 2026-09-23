import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VisitStatus } from './visit-status';

describe('VisitStatus', () => {
  let component: VisitStatus;
  let fixture: ComponentFixture<VisitStatus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisitStatus],
    }).compileComponents();

    fixture = TestBed.createComponent(VisitStatus);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
