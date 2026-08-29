import { Component, computed, inject, OnInit, signal, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ListService } from '../../services/list.service';
import { ListModel, ListPatchItem, ListStatusItem } from '../../models/lists';
import { ListItem } from './list-item/list-item';
import { MatButtonModule } from '@angular/material/button';
import { IngredientService } from '../../services/ingredient.service';
import { Ingredient, IngredientCategory } from '../../models/ingredient';
import { IngredientPicker } from '../ingredients/ingredient-picker/ingredient-picker';
import { MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-list',
  imports: [
    ListItem,
    MatButtonModule,
    IngredientPicker,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
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

  groupCode = signal<string | null>(null);
  list = signal<ListModel[]>([]);
  totalPrice = signal<number>(0);
  categories = signal<IngredientCategory[]>([]);
  activeCategories = computed(() => {
    const usedCategories: IngredientCategory[] = [];
    this.list().forEach((item) => {
      const mainCategory = this.getMainCategory(item.ingredient.id_ingredient_categories[0]); // La primera categoría será la principal

      if (!usedCategories.some((cat) => cat.id_ingredient_category === mainCategory)) {
        usedCategories.push(
          this.categories().find(
            (cat) => cat.id_ingredient_category === mainCategory,
          ) as IngredientCategory,
        );
      }
    });

    // Devolverlos siempre en el mismo orden independientemente de como venga la lista
    return usedCategories.sort((a, b) =>
      a.id_ingredient_category < b.id_ingredient_category ? -1 : 1,
    );
  });
  selectedCategory = signal<number | null>(null);
  filteredList = computed(() => {
    if (!this.selectedCategory()) return this.list();

    return this.list().filter((item) => {
      return (
        this.getMainCategory(item.ingredient.id_ingredient_categories[0]) ===
        this.selectedCategory()
      );
    });
  });

  selectedIngredient = signal<Ingredient | null>(null);
  ingredientAmount = signal(1);

  ngOnInit(): void {
    // Escuchar la url para el cambio de grupo
    this.route.paramMap.subscribe({
      next: (params) => {
        const groupCode = params.get('group_code');

        if (!groupCode) {
          return;
        }

        this.groupCode.set(groupCode);
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

  loadList() {
    this.listService.getLists(this.groupCode() || '').subscribe({
      next: (response) => {
        this.list.set(response.items);
        this.totalPrice.set(response.total_price);
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

  changeItemStatus(event: ListStatusItem) {
    this.listService
      .changeStatusListItem(this.groupCode() || '', event.id_ingredient, event.bought)
      .subscribe({
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
      if (this.activeCategories().some((cat) => cat.id_ingredient_category === id))
        this.selectedCategory.set(id);
    }
  }
}
