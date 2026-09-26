import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Recipe } from '../../../../models/recipe';
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

  it('should emits selected and deleted recipes with their mealtime', () => {
    const recipe = { id: 4, name: 'Tortilla' } as Recipe;
    component.time = 'DINNER';
    let addedRecipe: unknown;
    let deletedRecipe: unknown;
    component.addRecipe.subscribe((value) => (addedRecipe = value));
    component.deleteRecipe.subscribe((value) => (deletedRecipe = value));

    component.selectRecipe(recipe);
    component.onDeleteRecipe(4);

    expect(addedRecipe).toEqual({ recipe, time: 'DINNER' });
    expect(deletedRecipe).toEqual({ id_recipe: 4, time: 'DINNER' });
  });
});
