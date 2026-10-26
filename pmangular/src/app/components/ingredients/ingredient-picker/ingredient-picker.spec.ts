import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Ingredient, IngredientCategory } from '../../../models/ingredient';
import { IngredientPicker } from './ingredient-picker';
import { defaultTestProviders } from '../../../testing/test-providers';
import { HttpTestingController } from '@angular/common/http/testing';

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
    expect(component.searchResults()).toEqual([]);
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

    expect(component.mainCategories()).toHaveLength(2);
    expect(component.subcategories().map((category) => category.id_ingredient_category)).toEqual([2]);
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
});
