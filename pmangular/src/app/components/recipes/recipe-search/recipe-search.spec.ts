import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { PaginatedResponse } from '../../../models/paginated-response';
import { Recipe } from '../../../models/recipe';
import { vi } from 'vitest';

import { RecipeSearch } from './recipe-search';
import { RecipeService } from '../../../services/recipe.service';
import { defaultTestProviders } from '../../../testing/test-providers';

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
        ...defaultTestProviders,
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
    expect(recipeService.searchRecipes).toHaveBeenLastCalledWith('', [1], 1, false);
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
    expect(recipeService.searchRecipes).toHaveBeenCalledWith('', [1], 1, false);

    component.toggleCategory(1);
    expect(component.selectedCategoryIds()).toEqual([]);
  });

  it('searches all favorites instead of popular recipes and keeps filters when paginating or removing one', () => {
    recipeService.searchRecipes.mockReturnValueOnce(
      of({ count: 2, next: '?page=2', previous: null, results: [{ id: 1, is_favorite: true }] }),
    );
    component.setOnlyFavorites(true);
    expect(component.showingTopRecipes()).toBe(false);
    expect(recipeService.getTopRecipes).not.toHaveBeenCalled();
    expect(recipeService.searchRecipes).toHaveBeenLastCalledWith('', [], 1, true);
    component.loadMore();
    expect(recipeService.searchRecipes).toHaveBeenLastCalledWith('', [], 2, true);
    component.onFavoriteChanged(component.searchedRecipes()[0], false);
    expect(recipeService.searchRecipes).toHaveBeenLastCalledWith('', [], 1, true);
    component.searchName.set('');
    component.selectedCategoryIds.set([]);
    component.setOnlyFavorites(false);
    expect(component.showingTopRecipes()).toBe(true);
    expect(recipeService.getTopRecipes).toHaveBeenCalledOnce();
  });

  it('clears text and categories and cancels a pending text search when selecting favorites', () => {
    vi.useFakeTimers();
    try {
      component.updateSearchName({ target: { value: 'tarta' } } as unknown as Event);
      component.selectedCategoryIds.set([1, 2]);
      component.setOnlyFavorites(true);
      expect(component.searchName()).toBe('');
      expect(component.selectedCategoryIds()).toEqual([]);
      expect(recipeService.searchRecipes).toHaveBeenLastCalledWith('', [], 1, true);
      vi.advanceTimersByTime(300);
      expect(recipeService.searchRecipes).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it('deactivates favorites when typing and ignores their pending response', () => {
    const old = new Subject<PaginatedResponse<Recipe>>();
    recipeService.searchRecipes.mockReturnValueOnce(old);
    component.setOnlyFavorites(true);
    vi.useFakeTimers();
    try {
      component.updateSearchName({ target: { value: 'tarta' } } as unknown as Event);
      expect(component.onlyFavorites()).toBe(false);
      expect(component.selectedCategoryIds()).toEqual([]);
      old.next({ count: 1, next: '?page=2', previous: null, results: [{ id: 99 }] as Recipe[] });
      expect(component.searchedRecipes()).toEqual([]);
      vi.advanceTimersByTime(300);
      expect(recipeService.searchRecipes).toHaveBeenLastCalledWith('tarta', [], 1, false);
      expect(component.nextPage()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('deactivates favorites on category selection and preserves multiple normal categories', () => {
    component.setOnlyFavorites(true);
    component.toggleCategory(1);
    expect(component.onlyFavorites()).toBe(false);
    expect(component.searchName()).toBe('');
    component.toggleCategory(2);
    expect(recipeService.searchRecipes).toHaveBeenLastCalledWith('', [1, 2], 1, false);
    vi.useFakeTimers();
    try {
      component.updateSearchName({ target: { value: 'tarta' } } as unknown as Event);
      expect(component.selectedCategoryIds()).toEqual([]);
      vi.advanceTimersByTime(300);
      expect(recipeService.searchRecipes).toHaveBeenLastCalledWith('tarta', [], 1, false);
    } finally {
      vi.useRealTimers();
    }
  });
});
