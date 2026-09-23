import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TechLayout } from './tech-layout';

describe('TechLayout', () => {
  let component: TechLayout;
  let fixture: ComponentFixture<TechLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TechLayout],
    }).compileComponents();

    fixture = TestBed.createComponent(TechLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
