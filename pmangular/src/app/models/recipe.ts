export interface RecipeCategory {
  id: number;
  name: string;
  icon: string | null;
}

export interface RecipeIngredient {
  id_ingredient: string;
  name: string;
  image?: string | null;
  reference_format?: string | null;
  amount: number;
  unit: string;
}

export interface IngredientOption {
  id_ingredient: string;
  name: string;
  id_ingredient_categories: number[];
}

export interface RecipeComment {
  recipe: string;
  user: string;
  user_id: number;
  score: number;
  comment: string | null;
}

export interface Recipe {
  id: number;
  author: string;
  is_author: boolean;
  name: string;
  description: string;
  preparation_time: number;
  steps: string[];
  visibility: string;
  recipe_categories: RecipeCategory[];
  num_valorations: number;
  avg_score: number;
  ingredients: RecipeIngredient[];
}
