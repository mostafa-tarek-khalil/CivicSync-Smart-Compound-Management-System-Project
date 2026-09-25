import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { VisitorEntry } from './visitor-entry';

/** Blank route target so component navigations resolve during tests. */
@Component({ selector: 'app-test-blank', template: '' })
class TestBlankComponent {}

describe('VisitorEntry', () => {
  let component: VisitorEntry;
  let fixture: ComponentFixture<VisitorEntry>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisitorEntry],
      providers: [provideRouter([{ path: '**', component: TestBlankComponent }])],
    }).compileComponents();

    fixture = TestBed.createComponent(VisitorEntry);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});