import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Ingredient } from '../../../models/ingredient';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-ingredient-picker-result',
  imports: [MatButtonModule, MatCardModule, MatTooltipModule],
  templateUrl: './ingredient-picker-result.html',
  styleUrl: './ingredient-picker-result.css',
})
export class IngredientPickerResult {
  @Input() ingredient: Ingredient | null = null;
  @Input() selected = false;
  @Output() ingredientAdded = new EventEmitter<Ingredient>();

  addIngredient() {
    if (this.ingredient && !this.selected) {
      this.ingredientAdded.emit(this.ingredient);
    }
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
