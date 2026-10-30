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
import { AuthService } from '../../../services/auth.service';

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
  @Input() allowSelected = false;
  @Output() ingredientSelected = new EventEmitter<Ingredient>(); // Avisa al padre de cual se elige

  ingredientService = inject(IngredientService);
  readonly auth = inject(AuthService);
  readonly onlyFavorites = signal(false);

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
  resultCount = signal(0);
  private previousResults = signal<Ingredient[]>([]);
  displayedResults = computed(() => {
    const current = this.searchText() ? this.searchResults() : this.categoryIngredients();
    return !current.length && (this.isLoadingSearchResults() || this.isLoadingCategoryIngredients())
      ? this.previousResults()
      : current;
  });
  private categoryLoadFailed = false;
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
    this.loadCategories();
  }

  private loadCategories(): void {
    this.ingredientService
      .getIngredientCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => {
          this.categoryLoadFailed = false;
          this.errorMessage.set('');
          this.allCategories.set(categories);
        },
        error: () => {
          this.categoryLoadFailed = true;
          this.errorMessage.set('No se pudieron cargar las categorías. Puedes buscar por nombre.');
        },
      });
  }

  ngOnDestroy(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  searchIngredients(event: Event) {
    this.previousResults.set(this.displayedResults());
    this.categoryRequestId++;
    this.nextPage.set(null);
    this.errorMessage.set('');
    this.isLoadingMore.set(false);
    this.isLoadingCategoryIngredients.set(false);
    const name = (event.target as HTMLInputElement).value.trim();
    this.searchText.set(name);

    if (name) {
      this.onlyFavorites.set(false);
      this.selectedMainCategory.set(null);
      this.selectedSubcategory.set(null);
      this.categoryIngredients.set([]);
    }

    if (!name) {
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }
      this.isLoadingSearchResults.set(false);
      this.searchResults.set([]);
      if (this.selectedSubcategory() || this.selectedMainCategory() || this.onlyFavorites()) this.loadIngredients();
      else {
        this.categoryIngredients.set([]);
        this.resultCount.set(0);
      }
      return;
    }

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

  selectMainCategory(category: IngredientCategory | null) {
    this.previousResults.set(this.displayedResults());
    this.onlyFavorites.set(false);
    this.categoryRequestId++;
    clearTimeout(this.searchTimeout ?? undefined);
    this.nextPage.set(null);
    this.errorMessage.set('');
    this.isLoadingSearchResults.set(false);
    this.isLoadingCategoryIngredients.set(false);
    this.isLoadingMore.set(false);
    this.searchText.set('');
    this.selectedMainCategory.set(category);
    this.selectedSubcategory.set(null);
    if (category) this.loadIngredients();
    else {
      this.categoryIngredients.set([]);
      this.resultCount.set(0);
    }
  }

  selectSubcategory(category: IngredientCategory) {
    this.previousResults.set(this.displayedResults());
    this.onlyFavorites.set(false);
    clearTimeout(this.searchTimeout ?? undefined);
    this.searchText.set('');
    this.selectedSubcategory.set(
      this.selectedSubcategory()?.id_ingredient_category === category.id_ingredient_category ? null : category,
    );
    this.nextPage.set(null);
    this.loadIngredients();
  }

  loadIngredients(page = 1) {
    const name = this.searchText();
    const category = name ? null : (this.selectedSubcategory() ?? this.selectedMainCategory());
    if (!name && !category && !this.onlyFavorites()) return;
    const requestId = ++this.categoryRequestId;
    this.errorMessage.set('');
    this.isLoadingMore.set(page > 1);
    this.isLoadingSearchResults.set(!!name && page === 1);
    this.isLoadingCategoryIngredients.set(!name && page === 1);
    const request =
      name || !this.selectedSubcategory()
        ? this.ingredientService.searchIngredientsByName(
            name,
            page,
            category?.id_ingredient_category,
            this.onlyFavorites(),
          )
        : this.ingredientService.getIngredientsByCategory(category!.id_ingredient_category, page, this.onlyFavorites());
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (requestId !== this.categoryRequestId) {
          return;
        }

        const results = name ? this.searchResults : this.categoryIngredients;
        this.resultCount.set(response.count);
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

  setOnlyFavorites(value: boolean): void {
    this.previousResults.set(this.displayedResults());
    this.onlyFavorites.set(value);
    this.searchText.set('');
    this.selectedMainCategory.set(null);
    this.selectedSubcategory.set(null);
    clearTimeout(this.searchTimeout ?? undefined);
    this.categoryRequestId++;
    this.nextPage.set(null);
    this.errorMessage.set('');
    this.isLoadingMore.set(false);
    this.isLoadingSearchResults.set(false);
    this.isLoadingCategoryIngredients.set(false);
    this.searchResults.set([]);
    this.categoryIngredients.set([]);
    this.resultCount.set(0);
    this.loadIngredients();
  }

  onFavoriteChanged(ingredient: Ingredient, favorite: boolean): void {
    const update = (items: Ingredient[]) =>
      items.map((item) =>
        item.id_ingredient === ingredient.id_ingredient ? { ...item, is_favorite: favorite } : item,
      );
    this.searchResults.update(update);
    this.categoryIngredients.update(update);
    this.previousResults.update(update);
    if (this.onlyFavorites()) this.setOnlyFavorites(true);
  }

  addIngredient(ingredient: Ingredient) {
    if (!this.allowSelected && this.selectedIngredientIds.includes(ingredient.id_ingredient)) {
      return;
    }

    this.ingredientSelected.emit(ingredient);
  }

  isIngredientSelected(ingredientId: string) {
    return this.selectedIngredientIds.includes(ingredientId);
  }

  clearSearch(): void {
    this.searchIngredients({ target: { value: '' } } as unknown as Event);
  }

  retry(): void {
    if (this.categoryLoadFailed) this.loadCategories();
    this.loadIngredients(this.nextPage() ?? 1);
  }
}
