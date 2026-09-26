import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const recipeCount = 500;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const productsFilePath = path.join(__dirname, "products.json");
const recipesFilePath = path.join(__dirname, "recipes.json");

const ingredientCategories = {
  vegetables: [27, 28, 29],
  fish: [31, 32, 34, 36, 122, 123],
  meat: [37, 38, 40, 42, 44, 45, 46, 47],
  bread: [59, 60, 62, 64],
  baking: [65, 66, 68, 69],
  dairy: [72, 75, 77],
  cereal: [78, 79, 80],
  sauces: [112, 115, 116, 117],
  grains: [118, 120, 121],
  canned: [122, 123, 126, 127, 129, 130],
  fruit: [27],
};

const recipeTypes = [
  { name: "Desayuno", categories: [1, 19], ingredients: ["cereal", "dairy", "fruit"], time: 10 },
  { name: "Entrante", categories: [2, 19], ingredients: ["bread", "vegetables", "sauces"], time: 15 },
  { name: "Ensalada", categories: [3, 13, 19], ingredients: ["vegetables", "canned", "dairy"], time: 12 },
  { name: "Crema de verduras", categories: [4, 8, 13], ingredients: ["vegetables", "canned", "sauces"], time: 30 },
  { name: "Arroz", categories: [5, 19], ingredients: ["grains", "vegetables", "meat"], time: 35 },
  { name: "Pasta", categories: [6, 19], ingredients: ["grains", "vegetables", "sauces"], time: 25 },
  { name: "Legumbres", categories: [7, 13], ingredients: ["grains", "vegetables", "canned"], time: 30 },
  { name: "Verduras salteadas", categories: [8, 13, 14], ingredients: ["vegetables", "sauces", "canned"], time: 20 },
  { name: "Carne con guarnición", categories: [9, 15], ingredients: ["meat", "vegetables", "sauces"], time: 35 },
  { name: "Pescado al horno", categories: [10, 15], ingredients: ["fish", "vegetables", "sauces"], time: 30 },
  { name: "Pizza casera", categories: [11, 19], ingredients: ["bread", "sauces", "dairy", "vegetables"], time: 25 },
  { name: "Bocadillo", categories: [12, 19], ingredients: ["bread", "meat", "vegetables"], time: 10 },
  { name: "Plato vegetariano", categories: [13, 8], ingredients: ["grains", "vegetables", "dairy"], time: 25 },
  { name: "Plato vegano", categories: [14, 8], ingredients: ["grains", "vegetables", "sauces"], time: 25 },
  { name: "Guarnición", categories: [15, 8], ingredients: ["vegetables", "sauces"], time: 20 },
  { name: "Postre", categories: [16], ingredients: ["dairy", "fruit", "cereal"], time: 15 },
  { name: "Repostería", categories: [17], ingredients: ["baking", "dairy", "fruit"], time: 40 },
  { name: "Bebida", categories: [18], ingredients: ["fruit", "dairy"], time: 10 },
  { name: "Receta rápida", categories: [19], ingredients: ["canned", "grains", "vegetables"], time: 15 },
];

function getProductsByCategory(products, categoryIds) {
  return products.filter((product) =>
    product.id_ingredient_categories.some((categoryId) => categoryIds.includes(categoryId)),
  );
}

function getAmount(referenceFormat, seed) {
  const amounts = {
    kg: ["0.150", "0.200", "0.250", "0.300", "0.400"],
    L: ["0.100", "0.200", "0.250", "0.500"],
    ud: ["1.000", "2.000", "3.000"],
    dz: ["0.250", "0.500", "1.000"],
  };
  const availableAmounts = amounts[referenceFormat] ?? ["1.000"];

  return availableAmounts[seed % availableAmounts.length];
}

function getIngredient(pool, seed, usedIngredientIds) {
  for (let index = 0; index < pool.length; index += 1) {
    const product = pool[(seed + index) % pool.length];

    if (!usedIngredientIds.has(product.id_ingredient)) {
      usedIngredientIds.add(product.id_ingredient);
      return {
        id_ingredient: String(product.id_ingredient),
        amount: getAmount(product.reference_format, seed),
        unit: product.reference_format,
      };
    }
  }

  throw new Error("No hay suficientes productos distintos para crear la receta");
}

function createRecipe(index, productPools) {
  const recipeType = recipeTypes[index % recipeTypes.length];
  const usedIngredientIds = new Set();
  const ingredients = recipeType.ingredients.map((ingredientType, ingredientIndex) =>
    getIngredient(productPools[ingredientType], index * 3 + ingredientIndex, usedIngredientIds),
  );
  const mainIngredient = productPools[recipeType.ingredients[0]][index % productPools[recipeType.ingredients[0]].length];

  return {
    name: `${recipeType.name} con ${mainIngredient.name} ${index + 1}`,
    description: `${recipeType.name} sencilla preparada con productos habituales de la compra.`,
    preparation_time: recipeType.time + ((index % 4) * 5),
    visibility: "PUBLIC",
    recipe_categories: recipeType.categories,
    steps: [
      "Preparar y cortar los ingredientes necesarios.",
      "Cocinar los ingredientes principales a fuego medio.",
      "Mezclar y ajustar el punto de sal al gusto.",
      "Servir recién hecho.",
    ],
    ingredients,
  };
}

function generateRecipes() {
  const products = JSON.parse(fs.readFileSync(productsFilePath, "utf8"));
  const productPools = Object.fromEntries(
    Object.entries(ingredientCategories).map(([name, categoryIds]) => [
      name,
      getProductsByCategory(products, categoryIds),
    ]),
  );

  for (const [name, productsInCategory] of Object.entries(productPools)) {
    if (productsInCategory.length === 0) {
      throw new Error(`No hay productos disponibles para la categoría ${name}`);
    }
  }

  const recipes = Array.from({ length: recipeCount }, (_, index) =>
    createRecipe(index, productPools),
  );

  fs.writeFileSync(recipesFilePath, `${JSON.stringify(recipes, null, 2)}\n`);
  console.log(`Generadas ${recipes.length} recetas en ${recipesFilePath}`);
}

generateRecipes();
