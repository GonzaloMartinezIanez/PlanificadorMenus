import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Ingredient, IngredientCategory } from '../../../models/ingredient';
import { IngredientService } from '../../../services/ingredient.service';
import { IngredientPickerResult } from '../ingredient-picker-result/ingredient-picker-result';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-ingredient-picker',
  imports: [
    CommonModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    IngredientPickerResult,
    MatIconModule,
  ],
  templateUrl: './ingredient-picker.html',
  styleUrl: './ingredient-picker.css',
})
export class IngredientPicker implements OnInit {
  @Input() selectedIngredientIds: string[] = []; // El padre le indica cuales han sido elegidos
  @Output() ingredientSelected = new EventEmitter<Ingredient>(); // Avisa al padre de cual se elige

  ingredientService = inject(IngredientService);

  allCategories = signal<IngredientCategory[]>([]);
  selectedMainCategory = signal<IngredientCategory | null>(null);
  selectedSubcategory = signal<IngredientCategory | null>(null);
  categoryIngredients = signal<Ingredient[]>([]);
  searchResults = signal<Ingredient[]>([]);
  searchText = signal('');
  isLoadingSearchResults = signal(false);
  isLoadingCategoryIngredients = signal(false);
  searchTimeout: ReturnType<typeof setTimeout> | null = null;
  categoryRequestId = 0;

  mainCategories = computed(() =>
    this.allCategories().filter((category) => category.primary_category === null),
  );

  subcategories = computed(() => {
    const selectedMainCategory = this.selectedMainCategory();

    if (!selectedMainCategory) {
      return [];
    }

    return this.allCategories().filter(
      (category) => category.primary_category === selectedMainCategory.id_ingredient_category,
    );
  });

  ngOnInit(): void {
    this.ingredientService.getIngredientCategories().subscribe({
      next: (categories) => {
        this.allCategories.set(categories);
      },
    });
  }

  ngOnDestroy(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  searchIngredients(event: Event) {
    const name = (event.target as HTMLInputElement).value.trim();
    this.searchText.set(name);

    if (!name) {
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }
      this.isLoadingSearchResults.set(false);
      this.searchResults.set([]);
      return;
    }

    this.scheduleSearch(name);
  }

  scheduleSearch(name: string) {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.isLoadingSearchResults.set(true);

    this.searchTimeout = setTimeout(() => {
      this.ingredientService.searchIngredientsByName(name).subscribe({
        next: (ingredients) => {
          this.searchResults.set(ingredients);
          this.isLoadingSearchResults.set(false);
        },
        error: () => {
          this.searchResults.set([]);
          this.isLoadingSearchResults.set(false);
        },
      });
    }, 300);
  }

  selectMainCategory(category: IngredientCategory) {
    this.categoryRequestId++;
    this.selectedMainCategory.set(category);
    this.selectedSubcategory.set(null);
    this.categoryIngredients.set([]);
    this.searchText.set('');
    this.searchResults.set([]);
  }

  selectSubcategory(category: IngredientCategory) {
    const requestId = ++this.categoryRequestId; // Evitar que se puedan mandar dos peticiones
    this.selectedSubcategory.set(category);
    this.isLoadingCategoryIngredients.set(this.categoryIngredients().length === 0);

    this.ingredientService.getIngredientsByCategory(category.id_ingredient_category).subscribe({
      next: (ingredients) => {
        if (requestId !== this.categoryRequestId) {
          return;
        }

        this.categoryIngredients.set(ingredients);
        this.isLoadingCategoryIngredients.set(false);
      },
      error: () => {
        if (requestId !== this.categoryRequestId) {
          return;
        }

        this.categoryIngredients.set([]);
        this.isLoadingCategoryIngredients.set(false);
      },
    });
  }

  addIngredient(ingredient: Ingredient) {
    if (this.selectedIngredientIds.includes(ingredient.id_ingredient)) {
      return;
    }

    this.ingredientSelected.emit(ingredient);
  }

  isIngredientSelected(ingredientId: string) {
    return this.selectedIngredientIds.includes(ingredientId);
  }
}
