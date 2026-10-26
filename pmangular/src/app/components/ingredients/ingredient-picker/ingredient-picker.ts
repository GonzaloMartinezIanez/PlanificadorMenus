import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
export class IngredientPicker implements OnInit, OnDestroy {
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
  private destroyRef = inject(DestroyRef);
  nextPage = signal<number | null>(null);
  errorMessage = signal('');
  isLoadingMore = signal(false);

  mainCategories = computed(() => this.allCategories().filter((category) => category.primary_category === null));

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
    this.categoryRequestId++;
    this.nextPage.set(null);
    this.errorMessage.set('');
    this.isLoadingMore.set(false);
    const name = (event.target as HTMLInputElement).value.trim();
    this.searchText.set(name);

    if (!name) {
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }
      this.isLoadingSearchResults.set(false);
      this.searchResults.set([]);
      if (this.selectedSubcategory()) this.loadIngredients();
      return;
    }

    this.searchResults.set([]);
    this.scheduleSearch();
  }

  scheduleSearch() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.isLoadingSearchResults.set(true);

    this.searchTimeout = setTimeout(() => {
      this.loadIngredients();
    }, 300);
  }

  selectMainCategory(category: IngredientCategory) {
    this.categoryRequestId++;
    clearTimeout(this.searchTimeout ?? undefined);
    this.nextPage.set(null);
    this.errorMessage.set('');
    this.isLoadingSearchResults.set(false);
    this.isLoadingCategoryIngredients.set(false);
    this.isLoadingMore.set(false);
    this.selectedMainCategory.set(category);
    this.selectedSubcategory.set(null);
    this.categoryIngredients.set([]);
    this.searchText.set('');
    this.searchResults.set([]);
  }

  selectSubcategory(category: IngredientCategory) {
    this.selectedSubcategory.set(category);
    this.categoryIngredients.set([]);
    this.nextPage.set(null);
    this.loadIngredients();
  }

  loadIngredients(page = 1) {
    const name = this.searchText();
    const category = this.selectedSubcategory();
    if (!name && !category) return;
    const requestId = ++this.categoryRequestId;
    this.errorMessage.set('');
    this.isLoadingMore.set(page > 1);
    this.isLoadingSearchResults.set(!!name && page === 1);
    this.isLoadingCategoryIngredients.set(!name && page === 1);
    const request = name
      ? this.ingredientService.searchIngredientsByName(name, page)
      : this.ingredientService.getIngredientsByCategory(category!.id_ingredient_category, page);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (requestId !== this.categoryRequestId) {
          return;
        }

        const results = name ? this.searchResults : this.categoryIngredients;
        results.update((current) => (page === 1 ? response.results : [...current, ...response.results]));
        this.nextPage.set(response.next ? page + 1 : null);
        this.isLoadingSearchResults.set(false);
        this.isLoadingCategoryIngredients.set(false);
        this.isLoadingMore.set(false);
      },
      error: () => {
        if (requestId !== this.categoryRequestId) {
          return;
        }

        this.errorMessage.set('No se pudieron cargar los ingredientes. Vuelve a intentarlo.');
        this.isLoadingSearchResults.set(false);
        this.isLoadingCategoryIngredients.set(false);
        this.isLoadingMore.set(false);
      },
    });
  }

  loadMore() {
    const page = this.nextPage();
    if (page && !this.isLoadingMore()) this.loadIngredients(page);
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
