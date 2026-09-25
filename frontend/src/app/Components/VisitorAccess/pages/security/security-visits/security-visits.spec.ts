import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SecurityVisits } from './security-visits';

/** Blank route target so component navigations resolve during tests. */
@Component({ selector: 'app-test-blank', template: '' })
class TestBlankComponent {}

describe('SecurityVisits', () => {
  let component: SecurityVisits;
  let fixture: ComponentFixture<SecurityVisits>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SecurityVisits],
      providers: [
        provideRouter([{ path: '**', component: TestBlankComponent }]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SecurityVisits);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
