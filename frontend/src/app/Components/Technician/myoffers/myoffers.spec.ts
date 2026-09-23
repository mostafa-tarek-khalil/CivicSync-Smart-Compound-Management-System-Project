import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Myoffers } from './myoffers';

describe('Myoffers', () => {
  let component: Myoffers;
  let fixture: ComponentFixture<Myoffers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Myoffers],
    }).compileComponents();

    fixture = TestBed.createComponent(Myoffers);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
