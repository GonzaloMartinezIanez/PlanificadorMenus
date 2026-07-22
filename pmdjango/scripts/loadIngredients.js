import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const baseURL = "http://127.0.0.1:8000"
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const categoriesFilePath = path.join(__dirname, "categories.json")
const productsFilePath = path.join(__dirname, "products.json")

async function loadCategories(output = "") {
  const listCategories = []
  const idCategories = []

  const response = await fetch("https://tienda.mercadona.es/api/categories/")
  const categories = await response.json()

  categories.results.forEach((cat) => {
    listCategories.push({
      id_ingredient_category: Number(cat.id),
      name: cat.name,
      primary_category: null,
      icon: null,
    })
    idCategories.push(Number(cat.id))

    cat.categories.forEach((c) => {
      listCategories.push({
        id_ingredient_category: Number(c.id),
        name: c.name,
        primary_category: Number(cat.id),
        icon: null,
      })
      idCategories.push(Number(c.id))
    })
  })

  const sortedCategories = listCategories.sort((a, b) => a.id_ingredient_category > b.id_ingredient_category ? 1 : -1)

  switch (output) {
    case "log":
      console.log(sortedCategories)
      break
    case "file":
      fs.writeFileSync(categoriesFilePath, JSON.stringify(sortedCategories, null, 2))
      break
    default:
      console.log("Pasa 'log' o 'file' a la funcion para mostrar o guardar la informacion.")
      break
  }

  return idCategories.sort((a, b) => (a > b ? 1 : -1))
}

async function insertCategoriesInDB() {
  const categories = JSON.parse(fs.readFileSync(categoriesFilePath, "utf8"))

  if (categories.length === 0) {
    console.log("Ejecuta antes loadCategories('file')")
    return
  }

  const response = await fetch(`${baseURL}/api/ingredient_categories/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(categories),
  })

  if(response.status === 201) {
    console.log("Categorias insertadas correctamente en la base de datos")
  } else {
    console.log("Error al insertar categorias en la base de datos", await response.text())
  }

}

async function loadProducts() {
  const productMap = new Map()
  const idCategories = await loadCategories()

  for (const id of idCategories) {
    const response = await fetch(`https://tienda.mercadona.es/api/categories/${id}/`)
    const products = await response.json()

    process.stdout.write(`\rCargando productos de la categoria ${id}`)

    products.categories?.forEach((group) => {
      group.products.forEach((product) => {
        const productId = Number(product.id)
        const existingProduct = productMap.get(productId)

        // Un producto puede estar en dos categorías
        if (existingProduct) {
          if (!existingProduct.idIngredientCategories.includes(id)) {
            existingProduct.idIngredientCategories.push(id)
          }
          return
        }

        productMap.set(productId, {
          id_ingredient: productId,
          id_ingredient_categories: [Number(id)],
          name: product.display_name,
          packaging: product.packaging,
          reference_format: product.price_instructions.reference_format,
          reference_price: Number(product.price_instructions.reference_price),
          unit_price: Number(product.price_instructions.unit_price),
          unit_size: Number(product.price_instructions.unit_size),
          image: product.thumbnail.replaceAll("h=300&w=300", "h=100&w=100"),
        })
      })
    })
  }

  const listProducts = Array.from(productMap.values()).sort((a, b) =>
    a.id_ingredient > b.id_ingredient ? 1 : -1
  )

  console.log(`\nGuardados ${listProducts.length} productos unicos`)
  fs.writeFileSync(productsFilePath, JSON.stringify(listProducts, null, 2))
}

async function insertIngredientsInDB() {
  const ingredients = JSON.parse(fs.readFileSync(productsFilePath, "utf8"))

  if (ingredients.length === 0) {
    console.log("Ejecuta antes loadProducts()")
    return
  }

  const response = await fetch(`${baseURL}/api/ingredients/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(ingredients),
  })

  if(response.status === 201) {
    console.log("Ingredientes insertados correctamente en la base de datos")
  } else {
    console.log("Error al insertar ingredientes en la base de datos", await response.text())
  }
}

// await loadCategories("file")
// await loadProducts()
 await insertCategoriesInDB()
 await insertIngredientsInDB()
