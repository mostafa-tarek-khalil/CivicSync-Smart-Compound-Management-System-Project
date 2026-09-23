import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Createoffer } from './createoffer';

describe('Createoffer', () => {
  let component: Createoffer;
  let fixture: ComponentFixture<Createoffer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Createoffer],
    }).compileComponents();

    fixture = TestBed.createComponent(Createoffer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
