import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ListService } from '../../services/list.service';
import { ListModel, ListStatusItem } from '../../models/lists';
import { ListItem } from './list-item/list-item';
import { MatButtonModule } from '@angular/material/button';
import { IngredientService } from '../../services/ingredient.service';
import { IngredientCategory } from '../../models/ingredient';

@Component({
  selector: 'app-list',
  imports: [ListItem, MatButtonModule],
  templateUrl: './list.html',
  styleUrl: './list.css',
})
export class List implements OnInit {
  route = inject(ActivatedRoute);
  listService = inject(ListService);
  ingredientService = inject(IngredientService);

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
      return this.getMainCategory(item.ingredient.id_ingredient_categories[0]) === this.selectedCategory();
    });
  });

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

  changeSelectedCategory(id: number) {
    if (id === this.selectedCategory()) this.selectedCategory.set(null);
    else {
      if (this.activeCategories().some((cat) => cat.id_ingredient_category === id))
        this.selectedCategory.set(id);
    }
  }
}
