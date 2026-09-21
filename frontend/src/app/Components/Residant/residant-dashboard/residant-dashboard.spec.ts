import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResidantDashboard } from './residant-dashboard';

describe('ResidantDashboard', () => {
  let component: ResidantDashboard;
  let fixture: ComponentFixture<ResidantDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResidantDashboard],
    }).compileComponents();

    fixture = TestBed.createComponent(ResidantDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
