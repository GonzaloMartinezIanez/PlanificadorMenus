import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { PaginatedResponse } from '../../../models/paginated-response';
import { Recipe } from '../../../models/recipe';
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
    recipeService.searchRecipes.mockReturnValue(
      of({ count: 1, next: null, previous: null, results: [{ id: 2, name: 'Tortilla' }] }),
    );
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

  it('appends pages, keeps results on failure and resets pagination when filters change', () => {
    component.searchName.set('tortilla');
    recipeService.searchRecipes.mockReturnValueOnce(
      of({ count: 2, next: '?page=2', previous: null, results: [{ id: 1 }] }),
    );
    component.loadRecipes();
    expect(component.nextPage()).toBe(2);
    recipeService.searchRecipes.mockReturnValueOnce(throwError(() => new Error('Network')));
    component.loadMore();
    expect(component.searchedRecipes().map((recipe) => recipe.id)).toEqual([1]);
    expect(component.errorMessage()).not.toBe('');
    recipeService.searchRecipes.mockReturnValueOnce(
      of({ count: 2, next: null, previous: '?page=1', results: [{ id: 2 }] }),
    );
    component.loadMore();
    expect(component.searchedRecipes().map((recipe) => recipe.id)).toEqual([1, 2]);
    expect(component.nextPage()).toBeNull();
    component.toggleCategory(1);
    expect(component.searchedRecipes().map((recipe) => recipe.id)).toEqual([2]);
    expect(recipeService.searchRecipes).toHaveBeenLastCalledWith('tortilla', [1], 1);
  });

  it('ignores a late page after changing filters', () => {
    const old = new Subject<PaginatedResponse<Recipe>>();
    component.searchName.set('tortilla');
    recipeService.searchRecipes.mockReturnValueOnce(old);
    component.loadRecipes();
    component.toggleCategory(1);
    old.next({ count: 0, next: null, previous: null, results: [] });
    expect(component.searchedRecipes()[0].name).toBe('Tortilla');
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
    expect(recipeService.searchRecipes).toHaveBeenCalledWith('tortilla', [1], 1);

    component.toggleCategory(1);
    expect(component.selectedCategoryIds()).toEqual([]);
  });
});
