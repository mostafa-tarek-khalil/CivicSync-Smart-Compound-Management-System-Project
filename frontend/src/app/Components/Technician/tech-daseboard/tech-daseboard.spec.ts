import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TechDaseboard } from './tech-daseboard';

describe('TechDaseboard', () => {
  let component: TechDaseboard;
  let fixture: ComponentFixture<TechDaseboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TechDaseboard],
    }).compileComponents();

    fixture = TestBed.createComponent(TechDaseboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
