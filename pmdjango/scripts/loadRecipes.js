import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiUrl = "http://localhost:8000/api/recipes/"; // Por ejemplo: https://planificadormenus.es/api/recipes/
const accessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzkwNTI3NTk0LCJpYXQiOjE3OTA0NDExOTQsImp0aSI6IjQ2MjJmMjY3MGVlZTQ4ZTI5NGU5MjM2ODU0YzY3OGQ3IiwidXNlcl9pZCI6IjEifQ.8rXfsPSt0ToBNd2CnH_oxhAYRyiYZ7Ll51NH3KJMK6s"; // Pega aquí tu access token
const requestDelayMs = 50;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const recipesFilePath = path.join(__dirname, "recipes.json");

function getHeaders() {
  if (!apiUrl || !accessToken) {
    throw new Error("Debes indicar apiUrl y accessToken antes de ejecutar el script");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function loadRecipes() {
  const recipes = JSON.parse(fs.readFileSync(recipesFilePath, "utf8"));
  const errors = [];

  for (const [index, recipe] of recipes.entries()) {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(recipe),
    });

    if (response.status === 201) {
      console.log(`Receta insertada: ${index + 1}/${recipes.length}`);
    } else {
      errors.push({
        index: index + 1,
        name: recipe.name,
        error: await response.text(),
      });
      console.error(`Error al insertar la receta ${index + 1}: ${recipe.name}`);
    }

    await wait(requestDelayMs);
  }

  console.log(`Proceso terminado: ${recipes.length - errors.length}/${recipes.length} recetas insertadas.`);

  if (errors.length > 0) {
    console.log("Errores:", errors);
  }
}

loadRecipes().catch((error) => {
  console.error("No se pudieron insertar las recetas:", error.message);
  process.exitCode = 1;
});
