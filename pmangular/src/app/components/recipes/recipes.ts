import { Component } from '@angular/core';
import { RecipeCreate } from './recipe-create/recipe-create';
import { RecipeSearch } from './recipe-search/recipe-search';

@Component({
  selector: 'app-recipes',
  imports: [RecipeCreate, RecipeSearch],
  templateUrl: './recipes.html',
  styleUrl: './recipes.css',
})
export class Recipes {
  prueba(){
    alert("Esto es una prueba")
  }
}
