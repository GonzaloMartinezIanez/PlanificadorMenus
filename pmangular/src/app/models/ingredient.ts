export interface IngredientCategory {
  id_ingredient_category: number;
  name: string;
  primary_category: number | null;
  icon: string | null;
}

export interface Ingredient {
  id_ingredient: string;
  id_ingredient_categories: number[];
  name: string;
  packaging: string | null;
  reference_format: string | null;
  reference_price: number | null;
  unit_price: number | null;
  unit_size: number | null;
  image: string | null;
}
