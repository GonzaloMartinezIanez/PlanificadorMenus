import { Recipe } from "./recipe";

export interface MenuModel {
  recipe: Recipe;
  date: string;
  time: string;
}

export interface ShortMenuModel {
  id_recipe: number;
  date: string;
  time: string;
}