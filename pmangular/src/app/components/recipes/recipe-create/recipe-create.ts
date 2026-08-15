import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RecipeService } from '../../../services/recipe.service';
import { Recipe, RecipeCategory } from '../../../models/recipe';
import { Ingredient } from '../../../models/ingredient';
import { IngredientPicker } from '../../ingredients/ingredient-picker/ingredient-picker';

@Component({
  selector: 'app-recipe-create',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    IngredientPicker,
  ],
  templateUrl: './recipe-create.html',
  styleUrl: './recipe-create.css',
})
export class RecipeCreate implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
  fb = inject(FormBuilder);
  recipeService = inject(RecipeService);
  snackBar = inject(MatSnackBar);

  recipeCategories = signal<RecipeCategory[]>([]);
  isLoading = signal(false);
  isSaving = signal(false);
  mode = signal<'create' | 'create-from' | 'edit'>('create');
  recipeId = signal<number | null>(null);

  recipeForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    description: [''],
    preparation_time: [null as number | null],
    visibility: ['PUBLIC', Validators.required],
    recipe_categories: [[] as number[]],
    steps: this.fb.array([]),
    ingredients: this.fb.array([]),
  });

  ngOnInit(): void {
    this.recipeService.getRecipesCategories().subscribe({
      next: (categories) => {
        this.recipeCategories.set(categories);
      },
    });

    const editId = Number(this.route.snapshot.paramMap.get('id'));
    const createFromId = Number(this.route.snapshot.paramMap.get('originalId'));

    if (editId) {
      this.mode.set('edit');
      this.recipeId.set(editId);
      this.loadRecipe(editId);
      return;
    }

    if (createFromId) {
      this.mode.set('create-from');
      this.loadRecipe(createFromId);
      return;
    }

    this.addStep();
  }

  steps() {
    return this.recipeForm.get('steps') as FormArray;
  }

  ingredients() {
    return this.recipeForm.get('ingredients') as FormArray;
  }

  getTitle() {
    if (this.mode() === 'edit') {
      return 'Editar receta';
    } else if (this.mode() === 'create-from') {
      return 'Crear receta a partir de otra';
    } else {
      return 'Crear receta';
    }
  }

  loadRecipe(id: number) {
    this.isLoading.set(true);

    this.recipeService.getRecipeById(id).subscribe({
      next: (recipe) => {
        this.fillFormFromRecipe(recipe);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.showError(err.error.error ?? 'No se pudo cargar la receta.');
        this.isLoading.set(false);
      },
    });
  }

  fillFormFromRecipe(recipe: Recipe) {
    this.clearFormArrays();

    this.recipeForm.patchValue({
      name: this.mode() === 'edit' ? recipe.name : `${recipe.name} (copia)`,
      description: recipe.description,
      preparation_time: recipe.preparation_time,
      visibility: recipe.visibility,
      recipe_categories: recipe.recipe_categories.map((category) => category.id),
    });

    if (recipe.steps && recipe.steps.length > 0) {
      recipe.steps.forEach((step) => {
        this.steps().push(this.fb.control(step, Validators.required));
      });
    } else {
      this.addStep();
    }

    if (recipe.ingredients && recipe.ingredients.length > 0) {
      recipe.ingredients.forEach((ingredient) => {
        this.ingredients().push(
          this.fb.group({
            id_ingredient: [ingredient.id_ingredient, Validators.required],
            name: [ingredient.name],
            image: [ingredient.image ?? null],
            reference_format: [ingredient.reference_format ?? null],
            amount: [ingredient.amount, [Validators.required, Validators.min(0.001)]],
            unit: [ingredient.unit, Validators.required],
          }),
        );
      });
    }
  }

  clearFormArrays() {
    while (this.steps().length > 0) {
      this.steps().removeAt(0);
    }

    while (this.ingredients().length > 0) {
      this.ingredients().removeAt(0);
    }
  }

  addStep() {
    this.steps().push(this.fb.control('', Validators.required));
  }

  removeStep(index: number) {
    this.steps().removeAt(index);

    if (this.steps().length === 0) {
      this.addStep();
    }
  }

  // Función que se ejecuta cuando se selecciona un ingrediente en el ingrediente-picker
  // Añade el ingrediente al final de la lista
  addIngredient(ingredient: Ingredient) {
    this.ingredients().push(
      this.fb.group({
        id_ingredient: [ingredient.id_ingredient, Validators.required],
        name: [ingredient.name],
        image: [ingredient.image],
        reference_format: [ingredient.reference_format],
        amount: [0, [Validators.required, Validators.min(0.001)]],
        unit: [this.getDefaultUnit(ingredient), Validators.required], // Por defecto se marca el tipo de unidad de referencia
      }),
    );
  }

  removeIngredient(index: number) {
    this.ingredients().removeAt(index);
  }

  getSelectedIngredientIds() {
    return this.ingredients().controls.map((control) => control.value.id_ingredient);
  }

  getDefaultUnit(ingredient: Ingredient) {
    if (ingredient.reference_format) {
      return ingredient.reference_format;
    }

    return 'unit';
  }

  // Dar la opción de elegir la cantidad en la unidad de medida del producto (Kg, L...) o
  // en las unidades que vende mercadona
  getUnitOptions(index: number) {
    const ingredient = this.ingredients().at(index);
    const referenceFormat = ingredient?.get('reference_format')?.value;

    if (referenceFormat && referenceFormat !== 'unit') {
      return ['unit', referenceFormat];
    }

    return ['unit'];
  }

  saveRecipe() {
    if (this.recipeForm.invalid) {
      this.recipeForm.markAllAsTouched();
      return;
    }

    const rawValue = this.recipeForm.getRawValue();
    const steps = (rawValue.steps ?? []) as string[];
    const ingredients = (rawValue.ingredients ?? []) as Array<{
      id_ingredient: string;
      amount: number;
      unit: string;
    }>;

    const payload = {
      name: rawValue.name,
      description: rawValue.description ?? '',
      preparation_time: rawValue.preparation_time,
      visibility: rawValue.visibility,
      recipe_categories: rawValue.recipe_categories ?? [],
      steps: steps.filter((step) => !!step && step.trim() !== ''),
      ingredients: ingredients.map((ingredient) => ({
        id_ingredient: ingredient.id_ingredient,
        amount: ingredient.amount,
        unit: ingredient.unit,
      })),
    };

    this.isSaving.set(true);

    if (this.mode() === 'edit' && this.recipeId()) {
      this.recipeService.updateRecipe(this.recipeId()!, payload).subscribe({
        next: (recipe) => {
          this.showInfo('Receta actualizada correctamente.');
          this.router.navigate(['/recipes', recipe.id]);
        },
        error: (err) => {
          this.showError(err.error.error ?? 'No se pudo actualizar la receta.');
          this.isSaving.set(false);
        },
      });
      return;
    }

    this.recipeService.createRecipe(payload).subscribe({
      next: (recipe) => {
        this.showInfo('Receta creada correctamente.');
        this.router.navigate(['/recipes', recipe.id]);
      },
      error: (err) => {
        this.showError(err.error.error ?? 'No se pudo crear la receta.');
        this.isSaving.set(false);
      },
    });
  }

  showInfo(message: string) {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  showError(message: string) {
    this.snackBar.open(message, 'Cerrar', {
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['snackbar-error'],
    });
  }
}
