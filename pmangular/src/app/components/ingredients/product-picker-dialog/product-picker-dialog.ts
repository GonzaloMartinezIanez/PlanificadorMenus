import { afterNextRender, Component, computed, DestroyRef, inject, Injector, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { finalize, Observable } from 'rxjs';
import { Ingredient } from '../../../models/ingredient';
import { IngredientPicker } from '../ingredient-picker/ingredient-picker';
import { ProductQuantity, productUnit, validProductAmount } from '../product-quantity/product-quantity';

export interface ProductSelection {
  ingredient: Ingredient;
  amount: number;
}
export interface ProductPickerData {
  mode: 'list' | 'recipe';
  getAmounts: () => Readonly<Record<string, number>>;
  confirm: (selection: ProductSelection) => Observable<unknown>;
}

@Component({
  selector: 'app-product-picker-dialog',
  imports: [IngredientPicker, ProductQuantity, MatButtonModule, MatIconModule],
  templateUrl: './product-picker-dialog.html',
  styleUrl: './product-picker-dialog.css',
})
export class ProductPickerDialog {
  @ViewChild(ProductQuantity) private quantityControl?: ProductQuantity;
  private injector = inject(Injector);
  readonly data = inject<ProductPickerData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<ProductPickerDialog>);
  private destroyRef = inject(DestroyRef);
  private revision = signal(0);
  readonly amounts = computed(() => {
    this.revision();
    return this.data.getAmounts();
  });
  readonly selectedIds = computed(() => Object.keys(this.amounts()));
  readonly selected = signal<Ingredient | null>(null);
  readonly detailsCollapsed = signal(false);
  readonly amount = signal<number | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly valid = computed(() => validProductAmount(this.amount()) && !!this.selected()?.reference_format);
  readonly existing = computed(() => {
    const id = this.selected()?.id_ingredient ?? '';
    return Object.hasOwn(this.amounts(), id) ? this.amounts()[id] : null;
  });
  readonly resultingAmount = computed(() => {
    const amount = this.amount();
    return validProductAmount(amount)
      ? Math.round((amount + (this.data.mode === 'list' ? (this.existing() ?? 0) : 0)) * 1000) / 1000
      : null;
  });
  readonly packageCount = computed(() => {
    const step = Number(this.selected()?.package_amount);
    return validProductAmount(step) && this.resultingAmount() !== null
      ? Math.ceil(Math.round(this.resultingAmount()! * 1000) / Math.round(step * 1000))
      : null;
  });
  unit = productUnit;
  format(value: number): string {
    return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 3 }).format(value);
  }
  price(value: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  }
  select(ingredient: Ingredient): void {
    if (this.busy()) return;
    this.detailsCollapsed.set(false);
    this.selected.set(ingredient);
    const size = Number(ingredient.package_amount);
    this.amount.set(
      this.data.mode === 'recipe' && this.existing() !== null
        ? this.existing()
        : validProductAmount(size)
          ? size
          : null,
    );
    this.error.set('');
    afterNextRender(() => this.quantityControl?.focus(), { injector: this.injector });
  }
  toggleDetails(): void {
    this.detailsCollapsed.update((collapsed) => !collapsed);
  }
  add(): void {
    const ingredient = this.selected();
    const amount = this.amount();
    if (!ingredient || !validProductAmount(amount) || !this.valid() || this.busy()) return;
    this.busy.set(true);
    this.ref.disableClose = true;
    this.error.set('');
    this.data
      .confirm({ ingredient, amount })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.busy.set(false);
          this.ref.disableClose = false;
        }),
      )
      .subscribe({
        next: () => {
          this.revision.update((value) => value + 1);
          this.message.set(`${ingredient.name}: cantidad guardada. Puedes seguir añadiendo productos.`);
        },
        error: () => {
          this.detailsCollapsed.set(false);
          this.error.set('No se pudo guardar el producto. Tu selección se conserva; vuelve a intentarlo.');
        },
      });
  }
}
