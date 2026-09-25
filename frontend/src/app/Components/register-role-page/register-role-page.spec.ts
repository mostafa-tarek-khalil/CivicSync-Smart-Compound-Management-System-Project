import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { RegisterRolePage } from './register-role-page';

/** Blank route target so component navigations resolve during tests. */
@Component({ selector: 'app-test-blank', template: '' })
class TestBlankComponent {}

describe('RegisterRolePage', () => {
  let component: RegisterRolePage;
  let fixture: ComponentFixture<RegisterRolePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterRolePage],
      providers: [provideRouter([{ path: '**', component: TestBlankComponent }])],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterRolePage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
