import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ProductPickerDialog, ProductPickerData } from './product-picker-dialog';
import { Ingredient } from '../../../models/ingredient';
import { defaultTestProviders } from '../../../testing/test-providers';

describe('ProductPickerDialog', () => {
  const ingredient = { id_ingredient: 'milk', name: 'Leche', reference_format: 'L', package_amount: 0.5 } as Ingredient;
  let dialog: ProductPickerDialog;
  const ref = { close: vi.fn(), disableClose: false };
  const confirm = vi.fn();
  let data: ProductPickerData;
  beforeEach(() => {
    vi.resetAllMocks();
    confirm.mockReturnValue(of(null));
    data = { mode: 'list', getAmounts: () => ({ milk: 2 }), confirm };
    TestBed.configureTestingModule({
      imports: [ProductPickerDialog],
      providers: [
        ...defaultTestProviders,
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: ref },
      ],
    });
    dialog = TestBed.createComponent(ProductPickerDialog).componentInstance;
  });
  it('starts with one pack and keeps the dialog open after adding a product already in the list', () => {
    dialog.select(ingredient);
    expect(dialog.amount()).toBe(0.5);
    dialog.add();
    expect(confirm).toHaveBeenCalledWith({ ingredient, amount: 0.5 });
    expect(ref.close).not.toHaveBeenCalled();
    expect(dialog.selected()).toBe(ingredient);
    expect(dialog.message()).toContain('guardada');
  });
  it('starts an existing recipe ingredient at its current amount for editing', () => {
    data.mode = 'recipe';
    dialog.select(ingredient);
    expect(dialog.amount()).toBe(2);
  });
  it('waits for the server, prevents double submits and preserves the draft on failure', () => {
    const pending = new Subject<unknown>();
    confirm.mockReturnValue(pending);
    dialog.select(ingredient);
    dialog.amount.set(0.25);
    dialog.add();
    dialog.add();
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(ref.disableClose).toBe(true);
    pending.error(new Error('offline'));
    expect(dialog.amount()).toBe(0.25);
    expect(dialog.busy()).toBe(false);
    expect(dialog.error()).not.toBe('');
    confirm.mockReturnValue(throwError(() => new Error('again')));
    dialog.add();
    expect(dialog.amount()).toBe(0.25);
  });
  it('does not invent an initial quantity when pack data is missing', () => {
    dialog.select({ ...ingredient, package_amount: null });
    expect(dialog.amount()).toBeNull();
    expect(dialog.valid()).toBe(false);
  });
  it('keeps the chosen product and draft when hiding details and opens them for a new selection', () => {
    dialog.select(ingredient);
    dialog.amount.set(0.25);
    dialog.toggleDetails();
    expect(dialog.detailsCollapsed()).toBe(true);
    expect(dialog.selected()).toBe(ingredient);
    expect(dialog.amount()).toBe(0.25);
    dialog.toggleDetails();
    expect(dialog.amount()).toBe(0.25);
    dialog.toggleDetails();
    dialog.select({ ...ingredient, id_ingredient: 'other' });
    expect(dialog.detailsCollapsed()).toBe(false);
  });
});
