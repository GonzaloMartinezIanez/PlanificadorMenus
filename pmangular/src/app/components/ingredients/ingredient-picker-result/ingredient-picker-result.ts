import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Ingredient } from '../../../models/ingredient';
import { MatCardModule } from '@angular/material/card';
import { FavoriteButton } from '../../../core/favorite-button/favorite-button';

@Component({
  selector: 'app-ingredient-picker-result',
  imports: [MatButtonModule, MatCardModule, MatTooltipModule, FavoriteButton],
  templateUrl: './ingredient-picker-result.html',
  styleUrl: './ingredient-picker-result.css',
})
export class IngredientPickerResult {
  @Input() ingredient: Ingredient | null = null;
  @Input() selected = false;
  @Input() allowSelected = false;
  @Output() ingredientAdded = new EventEmitter<Ingredient>();
  @Output() favoriteChanged = new EventEmitter<boolean>();

  addIngredient() {
    if (this.ingredient && (!this.selected || this.allowSelected)) {
      this.ingredientAdded.emit(this.ingredient);
    }
  }

  formatPrice(price: number) {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  }

  formatAmount(amount: number | string) {
    return new Intl.NumberFormat('es-ES', {
      maximumFractionDigits: 3,
    }).format(Number(amount));
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
