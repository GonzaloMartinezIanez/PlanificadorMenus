import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Ingredient } from '../../../models/ingredient';
import { IngredientPickerResult } from './ingredient-picker-result';

describe('IngredientPickerResult', () => {
  let component: IngredientPickerResult;
  let fixture: ComponentFixture<IngredientPickerResult>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IngredientPickerResult],
    }).compileComponents();

    fixture = TestBed.createComponent(IngredientPickerResult);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emits the ingredient only when it is not selected', () => {
    const ingredient = { id_ingredient: '1', name: 'Tomate' } as Ingredient;
    const emittedIngredients: Ingredient[] = [];
    component.ingredient = ingredient;
    component.ingredientAdded.subscribe((value) => emittedIngredients.push(value));

    component.addIngredient();
    component.selected = true;
    component.addIngredient();

    expect(emittedIngredients).toEqual([ingredient]);
  });

  it('should format price, amount, and units', () => {
    expect(component.formatPrice(2.5)).toContain('2,50');
    expect(component.formatAmount(1.2345)).toBe('1,235');
    expect(component.formatUnit('ud')).toBe('unidad');
    expect(component.formatUnit('dz')).toBe('docena');
  });
});
