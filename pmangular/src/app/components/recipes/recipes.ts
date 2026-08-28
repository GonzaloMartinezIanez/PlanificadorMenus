import { Component } from '@angular/core';
import { RecipeSearch } from './recipe-search/recipe-search';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-recipes',
  imports: [RecipeSearch, RouterLink, MatButtonModule],
  templateUrl: './recipes.html',
  styleUrl: './recipes.css',
})
export class Recipes {
}
