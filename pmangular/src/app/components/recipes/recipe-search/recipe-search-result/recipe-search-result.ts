import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Recipe } from '../../../../models/recipe';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-recipe-search-result',
  imports: [CommonModule, MatCardModule, MatButtonModule, RouterLink],
  templateUrl: './recipe-search-result.html',
  styleUrl: './recipe-search-result.css',
})
export class RecipeSearchResult {
  @Input() recipe: Recipe | null = null;
  @Input() actionLabel = '';
  @Output() actionClicked = new EventEmitter<Recipe>();

  emitAction() {
    if (this.recipe) {
      this.actionClicked.emit(this.recipe);
    }
  }
}
