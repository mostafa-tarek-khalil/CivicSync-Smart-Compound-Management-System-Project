import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SecurityVisits } from './security-visits';

describe('SecurityVisits', () => {
  let component: SecurityVisits;
  let fixture: ComponentFixture<SecurityVisits>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SecurityVisits],
    }).compileComponents();

    fixture = TestBed.createComponent(SecurityVisits);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
