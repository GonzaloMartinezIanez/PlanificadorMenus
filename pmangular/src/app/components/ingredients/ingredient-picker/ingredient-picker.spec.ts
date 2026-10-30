import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Ingredient, IngredientCategory } from '../../../models/ingredient';
import { IngredientPicker } from './ingredient-picker';
import { defaultTestProviders } from '../../../testing/test-providers';
import { HttpTestingController } from '@angular/common/http/testing';
import { vi } from 'vitest';

describe('IngredientPicker', () => {
  let component: IngredientPicker;
  let fixture: ComponentFixture<IngredientPicker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IngredientPicker],
      providers: defaultTestProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(IngredientPicker);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads additional search pages, retries failures and ignores an old search response', () => {
    const http = TestBed.inject(HttpTestingController);
    component.searchText.set('arroz');
    component.loadIngredients();
    http
      .expectOne((req) => req.url.includes('ingredient_by_name'))
      .flush({ count: 2, next: '?page=2', previous: null, results: [{ id_ingredient: '1' }] });
    component.loadMore();
    const second = http.expectOne((req) => req.params.get('page') === '2');
    second.flush({}, { status: 500, statusText: 'Error' });
    expect(component.searchResults()).toHaveLength(1);
    expect(component.errorMessage()).not.toBe('');
    component.loadMore();
    http
      .expectOne((req) => req.params.get('page') === '2')
      .flush({ count: 2, next: null, previous: '?page=1', results: [{ id_ingredient: '2' }] });
    expect(component.searchResults().map((item) => item.id_ingredient)).toEqual(['1', '2']);
    expect(component.nextPage()).toBeNull();
    component.loadIngredients();
    const old = http.expectOne((req) => req.url.includes('ingredient_by_name'));
    component.selectMainCategory({ id_ingredient_category: 1, name: 'Fruta', primary_category: null, icon: null });
    old.flush({ count: 1, next: '?page=2', previous: null, results: [{ id_ingredient: 'old' }] });
    expect(component.searchResults().map((item) => item.id_ingredient)).toEqual(['1', '2']);
    http
      .expectOne((req) => req.params.get('category') === '1')
      .flush({ count: 1, next: null, previous: null, results: [{ id_ingredient: 'filtered' }] });
    expect(component.categoryIngredients()[0].id_ingredient).toBe('filtered');
    expect(component.searchText()).toBe('');
    expect(component.nextPage()).toBeNull();
  });

  it('restarts on page one when changing ingredient subcategory', () => {
    const http = TestBed.inject(HttpTestingController);
    const category = { id_ingredient_category: 2, name: 'Fruta', primary_category: 1, icon: null };
    component.selectSubcategory(category);
    http
      .expectOne((req) => req.url.includes('/2/ingredients/'))
      .flush({ count: 2, next: '?page=2', previous: null, results: [{ id_ingredient: '1' }] });
    component.loadMore();
    const old = http.expectOne((req) => req.params.get('page') === '2');
    component.selectSubcategory({ ...category, id_ingredient_category: 3 });
    http
      .expectOne((req) => req.url.includes('/3/ingredients/'))
      .flush({ count: 1, next: null, previous: null, results: [{ id_ingredient: '3' }] });
    old.flush({ count: 2, next: null, previous: '?page=1', results: [{ id_ingredient: '2' }] });
    expect(component.categoryIngredients().map((item) => item.id_ingredient)).toEqual(['3']);
    expect(component.nextPage()).toBeNull();
  });

  it('should shows only subcategories from the selected main category', () => {
    component.allCategories.set([
      { id_ingredient_category: 1, name: 'Fruta', primary_category: null, icon: null },
      { id_ingredient_category: 2, name: 'Verdura', primary_category: 1, icon: null },
      { id_ingredient_category: 3, name: 'Carne', primary_category: null, icon: null },
    ] as IngredientCategory[]);

    component.selectMainCategory(component.allCategories()[0]);
    TestBed.inject(HttpTestingController)
      .expectOne((req) => req.params.get('category') === '1')
      .flush({ count: 0, next: null, previous: null, results: [] });

    expect(component.mainCategories()).toHaveLength(2);
    expect(component.subcategories().map((category) => category.id_ingredient_category)).toEqual([2]);
  });

  it('clears both categories when typing and ignores a pending category response', () => {
    const http = TestBed.inject(HttpTestingController);
    component.selectedMainCategory.set({
      id_ingredient_category: 1,
      name: 'Fruta',
      primary_category: null,
      icon: null,
    });
    component.selectSubcategory({ id_ingredient_category: 2, name: 'Cítricos', primary_category: 1, icon: null });
    const old = http.expectOne((req) => req.url.includes('/2/ingredients/'));
    vi.useFakeTimers();
    try {
      component.searchIngredients({ target: { value: 'limón' } } as unknown as Event);
      expect(component.selectedMainCategory()).toBeNull();
      expect(component.selectedSubcategory()).toBeNull();
      old.flush({ count: 1, next: '?page=2', previous: null, results: [{ id_ingredient: 'old' }] });
      expect(component.categoryIngredients()).toEqual([]);
      expect(component.isLoadingCategoryIngredients()).toBe(false);
      vi.advanceTimersByTime(300);
      http
        .expectOne(
          (req) => new URL(req.urlWithParams).searchParams.get('name') === 'limón' && !req.params.has('category'),
        )
        .flush({ count: 1, next: null, previous: null, results: [{ id_ingredient: 'lemon' }] });
      expect(component.displayedResults()[0].id_ingredient).toBe('lemon');
      component.clearSearch();
      expect(component.displayedResults()).toEqual([]);
      expect(component.resultCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears the search and cancels its debounce when selecting a category', () => {
    const http = TestBed.inject(HttpTestingController);
    vi.useFakeTimers();
    try {
      component.searchIngredients({ target: { value: 'arroz' } } as unknown as Event);
      component.selectMainCategory({ id_ingredient_category: 1, name: 'Fruta', primary_category: null, icon: null });
      expect(component.searchText()).toBe('');
      http
        .expectOne((req) => req.params.get('category') === '1' && !new URL(req.urlWithParams).searchParams.get('name'))
        .flush({ count: 1, next: null, previous: null, results: [{ id_ingredient: 'fruit' }] });
      vi.advanceTimersByTime(300);
      http.expectNone((req) => req.url.includes('ingredient_by_name'));
      expect(component.displayedResults()[0].id_ingredient).toBe('fruit');
    } finally {
      vi.useRealTimers();
    }
  });

  it('should emit an ingredient only once', () => {
    const ingredient = { id_ingredient: '10', name: 'Tomate' } as Ingredient;
    const ingredients: Ingredient[] = [];
    component.ingredientSelected.subscribe((value) => ingredients.push(value));

    component.addIngredient(ingredient);
    component.selectedIngredientIds = ['10'];
    component.addIngredient(ingredient);

    expect(ingredients).toEqual([ingredient]);
    expect(component.isIngredientSelected('10')).toBe(true);
  });

  it('loads favorites without text, preserves the filter across pages and refreshes after removing one', () => {
    const http = TestBed.inject(HttpTestingController);
    component.setOnlyFavorites(true);
    http
      .expectOne((req) => req.params.get('favorites') === 'true')
      .flush({
        count: 2,
        next: '?page=2',
        previous: null,
        results: [{ id_ingredient: '1', is_favorite: true }],
      });
    component.loadMore();
    http
      .expectOne((req) => req.params.get('page') === '2' && req.params.get('favorites') === 'true')
      .flush({
        count: 2,
        next: null,
        previous: '?page=1',
        results: [{ id_ingredient: '2', is_favorite: true }],
      });
    component.onFavoriteChanged(component.displayedResults()[0], false);
    http
      .expectOne((req) => req.params.get('favorites') === 'true' && !req.params.has('page'))
      .flush({
        count: 1,
        next: null,
        previous: null,
        results: [{ id_ingredient: '2', is_favorite: true }],
      });
    expect(component.displayedResults().map((item) => item.id_ingredient)).toEqual(['2']);
    component.setOnlyFavorites(false);
    expect(component.displayedResults()).toEqual([]);
    expect(component.nextPage()).toBeNull();
  });

  it('clears text and both categories and cancels a debounced search when selecting favorites', () => {
    const http = TestBed.inject(HttpTestingController);
    vi.useFakeTimers();
    try {
      component.searchIngredients({ target: { value: 'arroz' } } as unknown as Event);
      component.selectedMainCategory.set({
        id_ingredient_category: 1,
        name: 'Fruta',
        primary_category: null,
        icon: null,
      });
      component.selectedSubcategory.set({
        id_ingredient_category: 2,
        name: 'Cítricos',
        primary_category: 1,
        icon: null,
      });
      component.setOnlyFavorites(true);
      expect(component.searchText()).toBe('');
      expect(component.selectedMainCategory()).toBeNull();
      expect(component.selectedSubcategory()).toBeNull();
      http
        .expectOne(
          (req) =>
            req.params.get('favorites') === 'true' &&
            !req.params.has('category') &&
            !new URL(req.urlWithParams).searchParams.get('name'),
        )
        .flush({ count: 0, next: null, previous: null, results: [] });
      vi.advanceTimersByTime(300);
      http.expectNone((req) => req.url.includes('ingredient_by_name'));
    } finally {
      vi.useRealTimers();
    }
  });

  it('deactivates favorites when typing and ignores an old favorites response', () => {
    const http = TestBed.inject(HttpTestingController);
    component.setOnlyFavorites(true);
    const old = http.expectOne((req) => req.params.get('favorites') === 'true');
    vi.useFakeTimers();
    try {
      component.searchIngredients({ target: { value: 'arroz' } } as unknown as Event);
      expect(component.onlyFavorites()).toBe(false);
      old.flush({ count: 1, next: '?page=2', previous: null, results: [{ id_ingredient: 'old' }] });
      expect(component.categoryIngredients()).toEqual([]);
      vi.advanceTimersByTime(300);
      http
        .expectOne(
          (req) => !req.params.has('favorites') && new URL(req.urlWithParams).searchParams.get('name') === 'arroz',
        )
        .flush({ count: 1, next: null, previous: null, results: [{ id_ingredient: 'rice' }] });
      expect(component.displayedResults()[0].id_ingredient).toBe('rice');
      expect(component.nextPage()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('deactivates favorites when choosing another category or subcategory', () => {
    const http = TestBed.inject(HttpTestingController);
    component.setOnlyFavorites(true);
    const old = http.expectOne((req) => req.params.get('favorites') === 'true');
    component.selectMainCategory({ id_ingredient_category: 1, name: 'Fruta', primary_category: null, icon: null });
    expect(component.onlyFavorites()).toBe(false);
    http
      .expectOne((req) => req.params.get('category') === '1' && !req.params.has('favorites'))
      .flush({ count: 1, next: null, previous: null, results: [{ id_ingredient: 'fruit' }] });
    old.flush({ count: 1, next: '?page=2', previous: null, results: [{ id_ingredient: 'old' }] });
    expect(component.displayedResults()[0].id_ingredient).toBe('fruit');
    component.onlyFavorites.set(true);
    component.selectSubcategory({ id_ingredient_category: 2, name: 'Cítricos', primary_category: 1, icon: null });
    expect(component.onlyFavorites()).toBe(false);
    http
      .expectOne((req) => req.url.includes('/2/ingredients/') && !req.params.has('favorites'))
      .flush({ count: 0, next: null, previous: null, results: [] });
  });
});
