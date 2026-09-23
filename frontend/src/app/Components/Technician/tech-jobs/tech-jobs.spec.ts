import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TechJobs } from './tech-jobs';

describe('TechJobs', () => {
  let component: TechJobs;
  let fixture: ComponentFixture<TechJobs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TechJobs],
    }).compileComponents();

    fixture = TestBed.createComponent(TechJobs);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
