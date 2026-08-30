import { ComponentFixture, TestBed } from '@angular/core/testing';
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
});
