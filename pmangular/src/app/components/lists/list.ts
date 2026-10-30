import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, tap } from 'rxjs';
import {
  ProductPickerDialog,
  ProductPickerData,
  ProductSelection,
} from '../ingredients/product-picker-dialog/product-picker-dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { ListService } from '../../services/list.service';
import { ListPatchItem, ListStatusItem, ListItemSaveResult } from '../../models/lists';
import { ListItem } from './list-item/list-item';
import { MatButtonModule } from '@angular/material/button';
import { IngredientService } from '../../services/ingredient.service';
import { IngredientCategory } from '../../models/ingredient';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ConfirmDialog } from '../../core/confirm-dialog/confirm-dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RealtimeService } from '../../services/realtime.service';
import { ShoppingListState } from '../../services/shopping-list-state.service';

@Component({
  selector: 'app-list',
  providers: [ShoppingListState],
  imports: [ListItem, MatButtonModule, MatCheckboxModule, MatTooltipModule, MatSnackBarModule],
  templateUrl: './list.html',
  styleUrl: './list.css',
})
export class List implements OnInit {
  route = inject(ActivatedRoute);
  listService = inject(ListService);
  ingredientService = inject(IngredientService);
  dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  private pickerRef?: MatDialogRef<ProductPickerDialog>;

  constructor() {
    this.destroyRef.onDestroy(() => this.pickerRef?.close());
  }
  private realtime = inject(RealtimeService);
  readonly state = inject(ShoppingListState);
  deletingItems = signal<Set<string>>(new Set());
  savingItems = signal<Set<string>>(new Set());
  saveResults = signal<Record<string, ListItemSaveResult>>({});

  groupCode = signal<string | null>(null);
  list = this.state.list;
  totalPrice = this.state.totalPrice;
  categories = signal<IngredientCategory[]>([]);
  activeCategories = computed(() => {
    const usedCategories: IngredientCategory[] = [];
    this.list().forEach((item) => {
      const mainCategory = this.getMainCategory(item.ingredient.id_ingredient_categories[0]); // La primera categoría será la principal

      const category = this.categories().find((cat) => cat.id_ingredient_category === mainCategory);
      if (category && !usedCategories.some((cat) => cat.id_ingredient_category === mainCategory)) {
        usedCategories.push(category);
      }
    });

    // Devolverlos siempre en el mismo orden independientemente de como venga la lista
    return usedCategories.sort((a, b) => (a.id_ingredient_category < b.id_ingredient_category ? -1 : 1));
  });
  selectedCategory = signal<number | null>(null);
  onlyPending = signal(false);
  filteredList = computed(() => {
    const items = this.onlyPending() ? this.list().filter((item) => !item.bought) : this.list();
    if (!this.selectedCategory()) return items;

    return items.filter((item) => {
      return this.getMainCategory(item.ingredient.id_ingredient_categories[0]) === this.selectedCategory();
    });
  });
  boughtItems = computed(() => {
    return this.list().filter((item) => item.bought).length;
  });

  ngOnInit(): void {
    this.realtime
      .watchGroup(() => this.groupCode(), ['shopping_list.changed'])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadList(true));
    // Escuchar la url para el cambio de grupo
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (params) => {
        const groupCode = params.get('group_code');

        if (!groupCode) {
          return;
        }

        if (groupCode !== this.groupCode()) this.pickerRef?.close();
        this.groupCode.set(groupCode);
        this.saveResults.set({});
        this.savingItems.set(new Set());
        this.state.replace({ items: [], total_price: 0 });
        this.loadList();
      },
    });

    this.loadIngredientCategories();
  }

  getMainCategory(id: number) {
    const category = this.categories().find((cat) => cat.id_ingredient_category === id);

    if (!category) {
      return null;
    }

    // Si es secundario devolver la principal, si es principal devolver su id
    return category.primary_category ?? category.id_ingredient_category;
  }

  loadIngredientCategories() {
    this.ingredientService.getIngredientCategories().subscribe({
      next: (cat) => {
        this.categories.set(cat);
      },
    });
  }

  loadList(background = false) {
    const groupCode = this.groupCode();
    if (!groupCode) return;
    this.state.load(
      groupCode,
      (response) => {
        if (this.groupCode() !== groupCode) return;
        const category = this.selectedCategory();
        if (
          category !== null &&
          !response.items.some((item) => this.getMainCategory(item.ingredient.id_ingredient_categories[0]) === category)
        )
          this.selectedCategory.set(null);
      },
      () => {
        if (!background && this.groupCode() === groupCode) {
          this.snackBar.open('No se pudo cargar la lista de la compra. Vuelve a intentarlo.', 'Cerrar', {
            duration: 4000,
            panelClass: ['snackbar-error'],
          });
        }
      },
    );
  }

  deleteItem(id: string) {
    const groupCode = this.groupCode();
    if (!groupCode || this.deletingItems().has(id)) return;
    this.deletingItems.update((ids) => new Set(ids).add(id));
    this.listService
      .deleteListItem(groupCode, id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() =>
          this.deletingItems.update((ids) => {
            const remaining = new Set(ids);
            remaining.delete(id);
            return remaining;
          }),
        ),
      )
      .subscribe({
        next: (response) => {
          if (this.groupCode() === groupCode) this.loadList();
          if (response.undo_id) {
            this.snackBar
              .open('Producto eliminado.', 'Deshacer', { duration: 8000 })
              .onAction()
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe(() => {
                this.listService
                  .restoreListItem(groupCode, id, response.undo_id!)
                  .pipe(takeUntilDestroyed(this.destroyRef))
                  .subscribe({
                    next: () => {
                      if (this.groupCode() === groupCode) this.loadList();
                    },
                    error: (err) =>
                      this.snackBar.open(err.error?.error ?? 'No se pudo deshacer la eliminación.', 'Cerrar', {
                        duration: 5000,
                      }),
                  });
              });
          }
        },
        error: () => {
          if (this.groupCode() !== groupCode) return;
          this.snackBar.open('No se pudo eliminar el producto. Vuelve a intentarlo.', 'Cerrar', {
            duration: 4000,
            panelClass: ['snackbar-error'],
          });
        },
      });
  }

  deleteList() {
    this.listService.deleteList(this.groupCode() || '').subscribe({
      next: () => {
        this.loadList();
      },
    });
  }

  openDeleteListDialog() {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: 'Limpiar lista de la compra',
          message: '¿Seguro que quieres eliminar todos los productos de la lista?',
          confirmText: 'Limpiar lista',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.deleteList();
        }
      });
  }

  changeItemStatus(event: ListStatusItem) {
    this.listService.changeStatusListItem(this.groupCode() || '', event.id_ingredient, event.bought).subscribe({
      next: () => {
        this.loadList();
      },
    });
  }

  changeItemAmount(event: ListPatchItem) {
    const groupCode = this.groupCode();
    if (!groupCode || this.savingItems().has(event.id_ingredient)) return;
    this.savingItems.update((ids) => new Set(ids).add(event.id_ingredient));
    this.listService
      .changeAmountListItem(groupCode, event.id_ingredient, {
        amount: event.amount,
        expected_amount: event.expected_amount,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (this.groupCode() === groupCode)
            this.savingItems.update((ids) => {
              const remaining = new Set(ids);
              remaining.delete(event.id_ingredient);
              return remaining;
            });
        }),
      )
      .subscribe({
        next: () => {
          if (this.groupCode() !== groupCode) return;
          this.saveResults.update((results) => ({ ...results, [event.id_ingredient]: { success: true } }));
          this.loadList();
        },
        error: (err) => {
          if (this.groupCode() !== groupCode) return;
          this.saveResults.update((results) => ({ ...results, [event.id_ingredient]: { success: false } }));
          this.loadList();
          this.snackBar.open(err.error?.error ?? 'No se pudo actualizar la cantidad.', 'Cerrar', { duration: 5000 });
        },
      });
  }

  openIngredientPicker() {
    const groupCode = this.groupCode();
    if (!groupCode) return;
    const ref = this.dialog.open(ProductPickerDialog, {
      width: '75rem',
      maxWidth: '96vw',
      height: '92dvh',
      maxHeight: '96dvh',
      ariaLabelledBy: 'product-picker-title',
      data: {
        mode: 'list',
        getAmounts: () => Object.fromEntries(this.list().map((item) => [item.ingredient.id_ingredient, item.amount])),
        confirm: ({ ingredient, amount }: ProductSelection) =>
          this.listService
            .postListItem(groupCode, {
              id_ingredient: ingredient.id_ingredient,
              amount,
              unit: ingredient.reference_format!,
            })
            .pipe(
              tap(() => {
                if (this.groupCode() === groupCode) this.loadList();
              }),
            ),
      } satisfies ProductPickerData,
    });
    this.pickerRef = ref;
    ref
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.pickerRef === ref) this.pickerRef = undefined;
      });
  }

  changeSelectedCategory(id: number) {
    if (id === this.selectedCategory()) this.selectedCategory.set(null);
    else {
      if (this.activeCategories().some((cat) => cat.id_ingredient_category === id)) this.selectedCategory.set(id);
    }
  }

  formatUnit(unit: string) {
    if (unit === 'ud') {
      return 'unidad';
    }

    // Tanto dc como dz representan docenas
    if (unit === 'dc' || unit === 'dz') {
      return 'docena';
    }

    return unit;
  }
}
