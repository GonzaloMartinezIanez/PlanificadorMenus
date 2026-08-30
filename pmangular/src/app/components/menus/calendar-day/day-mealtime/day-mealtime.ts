import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { MenuModel } from '../../../../models/menu';
import { Recipe } from '../../../../models/recipe';
import { RecipeSearch } from '../../../recipes/recipe-search/recipe-search';

@Component({
  selector: 'app-day-mealtime',
  imports: [CommonModule, MatButtonModule, RouterLink, RecipeSearch],
  templateUrl: './day-mealtime.html',
  styleUrl: './day-mealtime.css',
})
export class DayMealtime {
  @ViewChild('recipeSearchDialog') recipeSearchDialog!: TemplateRef<unknown>;

  dialog = inject(MatDialog);

  @Input() title = '';
  @Input() time = '';
  @Input() menus: MenuModel[] = [];

  @Output() addRecipe = new EventEmitter<{ recipe: Recipe; time: string }>();
  @Output() deleteRecipe = new EventEmitter<{ id_recipe: number; time: string }>();

  openRecipeSearch() {
    const dialogRef = this.dialog.open(this.recipeSearchDialog, {
      width: '95vw',
      maxWidth: '95vw',
      height: '90vh',
      maxHeight: '90vh',
    });

    dialogRef.afterClosed().subscribe({
      next: (recipe: Recipe | undefined) => {
        if (!recipe) {
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
    this.deleteRecipe.emit({
      id_recipe,
      time: this.time,
    });
  }
}
