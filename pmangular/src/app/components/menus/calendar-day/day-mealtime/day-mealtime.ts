import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output, TemplateRef, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { MenuModel } from '../../../../models/menu';
import { Recipe } from '../../../../models/recipe';
import { RecipeSearch } from '../../../recipes/recipe-search/recipe-search';

@Component({
  selector: 'app-day-mealtime',
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule, RouterLink, RecipeSearch],
  templateUrl: './day-mealtime.html',
  styleUrl: './day-mealtime.css',
})
export class DayMealtime {
  @ViewChild('recipeSearchDialog') recipeSearchDialog!: TemplateRef<unknown>;

  dialog = inject(MatDialog);

  @Input() title = '';
  @Input() time = '';
  @Input() menus: MenuModel[] = [];
  @Input() readOnly = false;

  @Output() addRecipe = new EventEmitter<{ recipe: Recipe; time: string }>();
  @Output() deleteRecipe = new EventEmitter<{ id_recipe: number; time: string }>();

  openRecipeSearch() {
    if (this.readOnly) return;
    const dialogRef = this.dialog.open(this.recipeSearchDialog, {
      width: '95vw',
      maxWidth: '95vw',
      height: '90vh',
      maxHeight: '90vh',
    });

    dialogRef.afterClosed().subscribe({
      next: (recipe: Recipe | undefined) => {
        if (!recipe || this.readOnly) {
          return;
        }

        this.addRecipe.emit({
          recipe,
          time: this.time,
        });
      },
    });
  }

  selectRecipe(recipe: Recipe) {
    if (this.readOnly) return;
    this.dialog.closeAll();

    this.addRecipe.emit({
      recipe,
      time: this.time,
    });
  }

  // Cerrar el dialog cuando se pulsa en Ver detalles que redirecciona url
  closeRecipeSearch() {
    this.dialog.closeAll();
  }

  onDeleteRecipe(id_recipe: number) {
    if (this.readOnly) return;
    this.deleteRecipe.emit({
      id_recipe,
      time: this.time,
    });
  }
}
