import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Technegetition } from './technegetition';

describe('Technegetition', () => {
  let component: Technegetition;
  let fixture: ComponentFixture<Technegetition>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Technegetition],
    }).compileComponents();

    fixture = TestBed.createComponent(Technegetition);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
