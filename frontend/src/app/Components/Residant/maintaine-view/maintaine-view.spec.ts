import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaintaineView } from './maintaine-view';

describe('MaintaineView', () => {
  let component: MaintaineView;
  let fixture: ComponentFixture<MaintaineView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaintaineView],
    }).compileComponents();

    fixture = TestBed.createComponent(MaintaineView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
