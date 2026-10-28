import { Component, computed, DestroyRef, inject, OnInit, signal, TemplateRef, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { ListService } from '../../services/list.service';
import { ListPatchItem, ListStatusItem } from '../../models/lists';
import { ListItem } from './list-item/list-item';
import { MatButtonModule } from '@angular/material/button';
import { IngredientService } from '../../services/ingredient.service';
import { Ingredient, IngredientCategory } from '../../models/ingredient';
import { IngredientPicker } from '../ingredients/ingredient-picker/ingredient-picker';
import { MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ConfirmDialog } from '../../core/confirm-dialog/confirm-dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RealtimeService } from '../../services/realtime.service';
import { ShoppingListState } from '../../services/shopping-list-state.service';

@Component({
  selector: 'app-list',
  providers: [ShoppingListState],
  imports: [
    ListItem,
    MatButtonModule,
    IngredientPicker,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  templateUrl: './list.html',
  styleUrl: './list.css',
})
export class List implements OnInit {
  @ViewChild('ingredientPickerDialog') ingredientPickerDialog!: TemplateRef<unknown>;

  route = inject(ActivatedRoute);
  listService = inject(ListService);
  ingredientService = inject(IngredientService);
  dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  private realtime = inject(RealtimeService);
  readonly state = inject(ShoppingListState);
  deletingItems = signal<Set<string>>(new Set());

  groupCode = signal<string | null>(null);
  list = this.state.list;
  totalPrice = this.state.totalPrice;
  categories = signal<IngredientCategory[]>([]);
  activeCategories = computed(() => {
    const usedCategories: IngredientCategory[] = [];
    this.list().forEach((item) => {
      const mainCategory = this.getMainCategory(item.ingredient.id_ingredient_categories[0]); // La primera categoría será la principal

      if (!usedCategories.some((cat) => cat.id_ingredient_category === mainCategory)) {
        usedCategories.push(
          this.categories().find((cat) => cat.id_ingredient_category === mainCategory) as IngredientCategory,
        );
      }
    });

    // Devolverlos siempre en el mismo orden independientemente de como venga la lista
    return usedCategories.sort((a, b) => (a.id_ingredient_category < b.id_ingredient_category ? -1 : 1));
  });
  selectedCategory = signal<number | null>(null);
  filteredList = computed(() => {
    if (!this.selectedCategory()) return this.list();

    return this.list().filter((item) => {
      return this.getMainCategory(item.ingredient.id_ingredient_categories[0]) === this.selectedCategory();
    });
  });
  boughtItems = computed(() => {
    return this.list().filter((item) => item.bought).length;
  });

  selectedIngredient = signal<Ingredient | null>(null);
  ingredientAmount = signal(1);

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

        this.groupCode.set(groupCode);
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
        next: () => {
          if (this.groupCode() === groupCode) this.loadList();
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
    this.listService
      .changeAmountListItem(this.groupCode() || '', event.id_ingredient, { amount: event.amount })
      .subscribe({
        next: () => {
          this.loadList();
        },
      });
  }

  openIngredientPicker() {
    this.selectedIngredient.set(null);
    this.ingredientAmount.set(1);
    this.dialog.open(this.ingredientPickerDialog, {
      width: '80vw',
      maxWidth: '80vw',
      height: '95vh',
      maxHeight: '95vh',
    });
  }

  selectIngredient(ingredient: Ingredient) {
    this.selectedIngredient.set(ingredient);
  }

  getSelectedIngredientIds() {
    return this.list().map((item) => item.ingredient.id_ingredient);
  }

  formatPrice(price: number) {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  }

  formatAmount(amount: number) {
    return new Intl.NumberFormat('es-ES', {
      maximumFractionDigits: 3,
    }).format(amount);
  }

  addSelectedIngredient() {
    const ingredient = this.selectedIngredient();

    if (!ingredient || this.ingredientAmount() < 0.001 || !ingredient.reference_format) {
      return;
    }

    this.listService
      .postListItem(this.groupCode() || '', {
        id_ingredient: ingredient.id_ingredient,
        amount: this.ingredientAmount(),
        unit: ingredient.reference_format,
      })
      .subscribe({
        next: () => {
          this.dialog.closeAll();
          this.loadList();
        },
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
