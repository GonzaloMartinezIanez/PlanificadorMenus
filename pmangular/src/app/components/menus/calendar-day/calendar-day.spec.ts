import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Recipe } from '../../../models/recipe';
import { CalendarDay } from './calendar-day';
import { provideRouter } from '@angular/router';

describe('CalendarDay', () => {
  let component: CalendarDay;
  let fixture: ComponentFixture<CalendarDay>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarDay],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarDay);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows past recipes as links but prevents addition and removal', () => {
    fixture.componentRef.setInput('day', new Date('2026-09-19T00:00:00'));
    fixture.componentRef.setInput('isPast', true);
    fixture.componentRef.setInput('menus', [
      { recipe: { id: 4, name: 'Tortilla' }, date: '2026-09-19', time: 'LUNCH' },
    ]);
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('a');
    expect(link.textContent).toContain('Tortilla');
    expect(link.getAttribute('href')).toBe('/recipes/4');
    expect(fixture.nativeElement.querySelectorAll('button')).toHaveLength(0);
    const actions: string[] = [];
    component.addRecipe.subscribe(() => actions.push('add'));
    component.deleteRecipe.subscribe(() => actions.push('delete'));
    component.onRecipeSelected({ recipe: { id: 4 } as Recipe, time: 'LUNCH' });
    component.onDeleteRecipe({ id_recipe: 4, time: 'LUNCH' });
    expect(actions).toEqual([]);
    fixture.componentRef.setInput('isPast', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('button')).toHaveLength(4);
  });

  it('should emits the recipe with the selected day date', () => {
    const recipe = { id: 4, name: 'Tortilla' } as Recipe;
    component.day = new Date('2026-09-19T00:00:00');
    let emittedValue: unknown;
    component.addRecipe.subscribe((value) => (emittedValue = value));

    component.onRecipeSelected({ recipe, time: 'LUNCH' });

    expect(emittedValue).toEqual({ date: '2026-09-19', time: 'LUNCH', recipe });
  });

  it('should filters menus by mealtime and emits deletions', () => {
    component.day = new Date('2026-09-19T00:00:00');
    component.menus = [
      { recipe: { id: 1 } as Recipe, date: '2026-09-19', time: 'BREAKFAST' },
      { recipe: { id: 2 } as Recipe, date: '2026-09-19', time: 'LUNCH' },
    ];
    let emittedValue: unknown;
    component.deleteRecipe.subscribe((value) => (emittedValue = value));

    component.onDeleteRecipe({ id_recipe: 2, time: 'LUNCH' });

    expect(component.getMenusByTime('LUNCH')).toHaveLength(1);
    expect(emittedValue).toEqual({ date: '2026-09-19', time: 'LUNCH', id_recipe: 2 });
  });
});
