import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Recipe } from '../../../../models/recipe';
import { RecipeSearchResult } from './recipe-search-result';

describe('RecipeSearchResult', () => {
  let component: RecipeSearchResult;
  let fixture: ComponentFixture<RecipeSearchResult>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeSearchResult],
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeSearchResult);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emits the recipe when the action is executed', () => {
    const recipe = { id: 3, name: 'Ensalada' } as Recipe;
    const recipes: Recipe[] = [];
    component.recipe = recipe;
    component.actionClicked.subscribe((value) => recipes.push(value));

    component.emitAction();

    expect(recipes).toEqual([recipe]);
  });

  it('should does not emit an action without a recipe and notifies when opening details', () => {
    let detailsClicks = 0;
    let actionClicks = 0;
    component.actionClicked.subscribe(() => (actionClicks += 1));
    component.detailsClicked.subscribe(() => (detailsClicks += 1));

    component.emitAction();
    component.emitDetails();

    expect(actionClicks).toBe(0);
    expect(detailsClicks).toBe(1);
  });
});
