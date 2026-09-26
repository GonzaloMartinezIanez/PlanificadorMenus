import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { RecipeSearch } from './recipe-search';
import { RecipeService } from '../../../services/recipe.service';

describe('RecipeSerach', () => {
  let component: RecipeSearch;
  let fixture: ComponentFixture<RecipeSearch>;
  const recipeService = {
    getRecipesCategories: vi.fn(),
    getTopRecipes: vi.fn(),
    searchRecipes: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    recipeService.getRecipesCategories.mockReturnValue(of([{ id: 1, name: 'Arroces', icon: null }]));
    recipeService.getTopRecipes.mockReturnValue(of([{ id: 1, name: 'Popular' }]));
    recipeService.searchRecipes.mockReturnValue(of([{ id: 2, name: 'Tortilla' }]));
    await TestBed.configureTestingModule({
      imports: [RecipeSearch],
      providers: [
        {
          provide: RecipeService,
          useValue: recipeService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeSearch);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should loads categories and popular recipes on initialization', () => {
    component.ngOnInit();

    expect(component.recipeCategories()).toHaveLength(1);
    expect(component.searchedRecipes()[0].name).toBe('Popular');
    expect(recipeService.getTopRecipes).toHaveBeenCalled();
  });

  it('should toggles categories and searches using the selected filters', () => {
    component.searchName.set('tortilla');
    component.toggleCategory(1);

    expect(component.selectedCategoryIds()).toEqual([1]);
    expect(recipeService.searchRecipes).toHaveBeenCalledWith('tortilla', [1]);

    component.toggleCategory(1);
    expect(component.selectedCategoryIds()).toEqual([]);
  });
});
