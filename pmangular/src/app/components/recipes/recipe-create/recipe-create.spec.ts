import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Ingredient } from '../../../models/ingredient';
import { RecipeCreate } from './recipe-create';
import { defaultTestProviders } from '../../../testing/test-providers';

describe('RecipeCreate', () => {
  let component: RecipeCreate;
  let fixture: ComponentFixture<RecipeCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeCreate],
      providers: defaultTestProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeCreate);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should always keep at least one step', () => {
    component.addStep();
    component.removeStep(0);

    expect(component.steps().length).toBe(1);
  });

  it('should add ingredients with their reference format and remove them', () => {
    const ingredient = {
      id_ingredient: '10',
      name: 'Tomate',
      image: null,
      reference_format: 'kg',
    } as Ingredient;

    component.addIngredient(ingredient);

    expect(component.ingredients().length).toBe(1);
    expect(component.ingredients().at(0).value.unit).toBe('kg');
    expect(component.getSelectedIngredientIds()).toEqual(['10']);

    component.removeIngredient(0);
    expect(component.ingredients().length).toBe(0);
  });

  it('should format units for the form', () => {
    expect(component.formatUnit('ud')).toBe('unidades');
    expect(component.formatUnit('dc')).toBe('docenas');
    expect(component.formatUnit('kg')).toBe('kg');
  });

  it('initializes ingredients with one package and validates manually entered fractions', () => {
    component.addIngredient({
      id_ingredient: 'rice',
      name: 'Arroz',
      reference_format: 'kg',
      package_amount: 0.5,
    } as Ingredient);
    const amount = component.ingredients().at(0).get('amount')!;
    expect(amount.value).toBe(0.5);
    amount.setValue(0.2);
    expect(amount.valid).toBe(true);
    amount.setValue(0.0001);
    expect(amount.valid).toBe(false);
    amount.setValue(0.1234);
    expect(amount.valid).toBe(false);
  });
});
