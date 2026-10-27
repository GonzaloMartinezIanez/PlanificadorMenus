import { ComponentFixture, TestBed } from '@angular/core/testing';

import { List } from './list';
import { defaultTestProviders } from '../../testing/test-providers';
import { HttpTestingController } from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { vi } from 'vitest';

describe('List', () => {
  let component: List;
  let fixture: ComponentFixture<List>;
  const snackBar = { open: vi.fn() };

  beforeEach(async () => {
    snackBar.open.mockClear();
    await TestBed.configureTestingModule({
      imports: [List],
      providers: defaultTestProviders,
    })
      .overrideProvider(MatSnackBar, { useValue: snackBar })
      .compileComponents();

    fixture = TestBed.createComponent(List);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('refreshes products and total after deleting the last product in the selected category', () => {
    const http = TestBed.inject(HttpTestingController);
    component.groupCode.set('GROUP');
    component.categories.set([
      { id_ingredient_category: 1, name: 'Fruta', primary_category: null, icon: null },
      { id_ingredient_category: 2, name: 'Pan', primary_category: null, icon: null },
    ]);
    component.selectedCategory.set(1);
    component.deleteItem('1');
    component.deleteItem('1');
    expect(component.deletingItems().has('1')).toBe(true);
    http.expectOne((req) => req.method === 'DELETE' && req.url.endsWith('/GROUP/1/')).flush({ message: 'Eliminado' });
    http
      .expectOne((req) => req.method === 'GET' && req.url.endsWith('/GROUP/'))
      .flush({
        items: [
          { ingredient: { id_ingredient: '2', id_ingredient_categories: [2] }, amount: 1, unit: 'ud', bought: false },
        ],
        total_price: 2,
      });
    expect(component.list().map((item) => item.ingredient.id_ingredient)).toEqual(['2']);
    expect(component.totalPrice()).toBe(2);
    expect(component.selectedCategory()).toBeNull();
    expect(component.deletingItems().size).toBe(0);
    http.verify();
  });

  it('keeps the product on deletion failure and displays a useful error', () => {
    const http = TestBed.inject(HttpTestingController);
    component.groupCode.set('GROUP');
    component.list.set([{ ingredient: { id_ingredient: '1' } }] as never);
    component.deleteItem('1');
    http.expectOne((req) => req.method === 'DELETE').flush({}, { status: 500, statusText: 'Error' });
    expect(component.list()).toHaveLength(1);
    expect(component.deletingItems().size).toBe(0);
    expect(snackBar.open).toHaveBeenCalledWith(
      'No se pudo eliminar el producto. Vuelve a intentarlo.',
      'Cerrar',
      expect.any(Object),
    );
    http.verify();
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
