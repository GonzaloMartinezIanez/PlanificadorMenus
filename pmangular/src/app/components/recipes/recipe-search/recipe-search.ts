import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { RecipeService } from '../../../services/recipe.service';
import { Recipe, RecipeCategory } from '../../../models/recipe';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { RecipeSearchResult } from './recipe-search-result/recipe-search-result';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-recipe-search',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    RecipeSearchResult,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './recipe-search.html',
  styleUrl: './recipe-search.css',
})
export class RecipeSearch implements OnInit {
  @Input() actionLabel = '';
  @Output() actionClicked = new EventEmitter<Recipe>();
  @Output() detailsClicked = new EventEmitter<void>();

  recipeService = inject(RecipeService);
  private destroyRef = inject(DestroyRef);
  private requestId = 0;
  nextPage = signal<number | null>(null);
  isLoading = signal(false);
  errorMessage = signal('');

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.searchTimeout ?? undefined));
  }

  recipeCategories = signal<RecipeCategory[]>([]);
  searchedRecipes = signal<Recipe[]>([]);

  searchName = signal('');
  selectedCategoryIds = signal<number[]>([]);
  showingTopRecipes = computed(() => this.searchName().trim() === '' && this.selectedCategoryIds().length === 0);

  searchTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.recipeService.getRecipesCategories().subscribe({
      next: (categories) => {
        this.recipeCategories.set(categories);
      },
    });

    this.loadRecipes();
  }

  updateSearchName(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchName.set(value);
    this.scheduleSearch();
  }

  toggleCategory(categoryId: number) {
    const currentCategoryIds = this.selectedCategoryIds();

    // Untoogle
    if (currentCategoryIds.includes(categoryId)) {
      this.selectedCategoryIds.set(currentCategoryIds.filter((id) => id !== categoryId));
    } else {
      // Toogle
      this.selectedCategoryIds.set([...currentCategoryIds, categoryId]);
    }

    this.loadRecipes();
  }

  // Para que no se haga una búsqueda en cada tecla, se añade un delay de 300ms
  scheduleSearch() {
    this.requestId++;
    this.nextPage.set(null);
    this.isLoading.set(true);
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(() => {
      this.loadRecipes();
    }, 300);
  }

  loadRecipes() {
    clearTimeout(this.searchTimeout ?? undefined);
    this.searchedRecipes.set([]);
    this.nextPage.set(null);
    if (this.showingTopRecipes()) {
      this.searchTopRecipes();
      return;
    }

    this.searchRecipes();
  }

  searchRecipes(page = 1) {
    const requestId = ++this.requestId;
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.recipeService
      .searchRecipes(this.searchName(), this.selectedCategoryIds(), page)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (requestId !== this.requestId) return;
          this.searchedRecipes.update((recipes) => (page === 1 ? response.results : [...recipes, ...response.results]));
          this.nextPage.set(response.next ? page + 1 : null);
          this.isLoading.set(false);
        },
        error: () => {
          if (requestId !== this.requestId) return;
          this.errorMessage.set('No se pudieron cargar las recetas. Vuelve a intentarlo.');
          this.isLoading.set(false);
        },
      });
  }

  searchTopRecipes() {
    const requestId = ++this.requestId;
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.recipeService
      .getTopRecipes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (recipes) => {
          if (requestId !== this.requestId) return;
          this.searchedRecipes.set(recipes);
          this.isLoading.set(false);
        },
        error: () => {
          if (requestId !== this.requestId) return;
          this.errorMessage.set('No se pudieron cargar las recetas. Vuelve a intentarlo.');
          this.isLoading.set(false);
        },
      });
  }

  isCategorySelected(categoryId: number) {
    return this.selectedCategoryIds().includes(categoryId);
  }

  loadMore() {
    const page = this.nextPage();
    if (page && !this.isLoading()) this.searchRecipes(page);
  }

  onActionClicked(recipe: Recipe) {
    this.actionClicked.emit(recipe);
  }

  onDetailsClicked() {
    this.detailsClicked.emit();
  }
}
