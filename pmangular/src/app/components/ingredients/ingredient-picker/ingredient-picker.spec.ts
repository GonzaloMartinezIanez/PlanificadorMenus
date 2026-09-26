import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Ingredient, IngredientCategory } from '../../../models/ingredient';
import { IngredientPicker } from './ingredient-picker';
import { defaultTestProviders } from '../../../testing/test-providers';

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
