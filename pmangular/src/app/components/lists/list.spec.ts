import { ComponentFixture, TestBed } from '@angular/core/testing';

import { List } from './list';
import { defaultTestProviders } from '../../testing/test-providers';

describe('List', () => {
  let component: List;
  let fixture: ComponentFixture<List>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [List],
      providers: defaultTestProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(List);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should get the main category and filter the list by it', () => {
    component.categories.set([
      { id_ingredient_category: 1, name: 'Fruta', primary_category: null, icon: null },
      { id_ingredient_category: 2, name: 'Verdura', primary_category: 1, icon: null },
    ]);
    component.list.set([
      {
        ingredient: { id_ingredient: '1', id_ingredient_categories: [2] },
        amount: 1,
        unit: 'kg',
        bought: false,
      },
    ] as never);

    component.changeSelectedCategory(1);

    expect(component.getMainCategory(2)).toBe(1);
    expect(component.filteredList()).toHaveLength(1);
    expect(component.activeCategories().map((category) => category.id_ingredient_category)).toEqual([1]);
  });

  it('should calculate purchased products and format units', () => {
    component.list.set([
      { ingredient: { id_ingredient: '1', id_ingredient_categories: [] }, amount: 1, unit: 'ud', bought: true },
      { ingredient: { id_ingredient: '2', id_ingredient_categories: [] }, amount: 1, unit: 'kg', bought: false },
    ] as never);

    expect(component.boughtItems()).toBe(1);
    expect(component.formatUnit('dz')).toBe('docena');
    expect(component.formatUnit('ud')).toBe('unidad');
  });
});
