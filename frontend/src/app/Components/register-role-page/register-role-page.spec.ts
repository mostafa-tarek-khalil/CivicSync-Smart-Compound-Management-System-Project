import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterRolePage } from './register-role-page';

describe('RegisterRolePage', () => {
  let component: RegisterRolePage;
  let fixture: ComponentFixture<RegisterRolePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterRolePage],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterRolePage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
