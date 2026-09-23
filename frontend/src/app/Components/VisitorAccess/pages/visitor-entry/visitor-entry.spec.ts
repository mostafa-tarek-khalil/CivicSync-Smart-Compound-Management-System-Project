import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { VisitorEntry } from './visitor-entry';

describe('VisitorEntry', () => {
  let component: VisitorEntry;
  let fixture: ComponentFixture<VisitorEntry>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisitorEntry],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(VisitorEntry);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});