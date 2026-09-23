import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Techreviews } from './techreviews';

describe('Techreviews', () => {
  let component: Techreviews;
  let fixture: ComponentFixture<Techreviews>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Techreviews],
    }).compileComponents();

    fixture = TestBed.createComponent(Techreviews);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
