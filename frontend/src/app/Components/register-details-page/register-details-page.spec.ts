import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterDetailsPage } from './register-details-page';

describe('RegisterDetailsPage', () => {
  let component: RegisterDetailsPage;
  let fixture: ComponentFixture<RegisterDetailsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterDetailsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterDetailsPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
