import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Menus } from './menus';
import { defaultTestProviders } from '../../testing/test-providers';

describe('Menus', () => {
  let component: Menus;
  let fixture: ComponentFixture<Menus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Menus],
      providers: defaultTestProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(Menus);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should generates seven consecutive days starting on Monday', () => {
    const week = component.generateWeek(new Date('2026-09-14T00:00:00'));

    expect(week).toHaveLength(7);
    expect(component.formatDate(week[0])).toBe('2026-09-14');
    expect(component.formatDate(week[6])).toBe('2026-09-20');
  });

  it('should prevent navigating to weeks before the current week', () => {
    component.today.set(new Date('2026-09-19T12:00:00'));
    component.week.set(component.generateWeek(component.thisMonday()));

    expect(component.canGoToPreviousWeek()).toBe(false);

    component.generateNextWeek();
    expect(component.canGoToPreviousWeek()).toBe(true);
  });

  it('should correctly identifies today and past days', () => {
    component.today.set(new Date('2026-09-19T12:00:00'));

    expect(component.isToday(new Date('2026-09-19T00:00:00'))).toBe(true);
    expect(component.isPastDay(new Date('2026-09-18T00:00:00'))).toBe(true);
  });
});
