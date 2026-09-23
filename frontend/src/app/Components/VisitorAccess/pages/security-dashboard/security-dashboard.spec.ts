import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SecurityDashboard } from './security-dashboard';

describe('SecurityDashboard', () => {
  let component: SecurityDashboard;
  let fixture: ComponentFixture<SecurityDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SecurityDashboard],
    }).compileComponents();

    fixture = TestBed.createComponent(SecurityDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
