import { ComponentFixture, TestBed } from '@angular/core/testing';

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
});
