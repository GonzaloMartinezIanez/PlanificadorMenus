export interface RecipeCategory {
  id: number;
  name: string;
  icon: string | null;
}

export interface RecipeIngredient {
  id_ingredient: string;
  name: string;
  amount: number;
  unit: string;
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
