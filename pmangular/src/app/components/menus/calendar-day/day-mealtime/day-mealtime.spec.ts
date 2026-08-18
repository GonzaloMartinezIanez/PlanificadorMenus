import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DayMealtime } from './day-mealtime';

describe('DayMealtime', () => {
  let component: DayMealtime;
  let fixture: ComponentFixture<DayMealtime>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DayMealtime],
    }).compileComponents();

    fixture = TestBed.createComponent(DayMealtime);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
