import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
} from '@angular/core';
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
  ],
  templateUrl: './recipe-search.html',
  styleUrl: './recipe-search.css',
})
export class RecipeSearch implements OnInit {
  @Input() actionLabel = '';
  @Output() actionClicked = new EventEmitter<Recipe>();
  @Output() detailsClicked = new EventEmitter<void>();

  recipeService = inject(RecipeService);

  recipeCategories = signal<RecipeCategory[]>([]);
  searchedRecipes = signal<Recipe[]>([]);

  searchName = signal('');
  selectedCategoryIds = signal<number[]>([]);
  showingTopRecipes = computed(
    () => this.searchName().trim() === '' && this.selectedCategoryIds().length === 0,
  );

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
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(() => {
      this.loadRecipes();
    }, 300);
  }

  loadRecipes() {
    if (this.showingTopRecipes()) {
      this.searchTopRecipes();
      return;
    }

    this.searchRecipes();
  }

  searchRecipes() {
    this.recipeService.searchRecipes(this.searchName(), this.selectedCategoryIds()).subscribe({
      next: (recipes) => {
        this.searchedRecipes.set(recipes);
      },
    });
  }

  searchTopRecipes() {
    this.recipeService.getTopRecipes().subscribe({
      next: (recipes) => {
        this.searchedRecipes.set(recipes);
      },
    });
  }

  isCategorySelected(categoryId: number) {
    return this.selectedCategoryIds().includes(categoryId);
  }

  onActionClicked(recipe: Recipe) {
    this.actionClicked.emit(recipe);
  }

  onDetailsClicked() {
    this.detailsClicked.emit();
  }
}
