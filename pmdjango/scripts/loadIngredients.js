import fs from "node:fs"

async function loadCategories(output = "") {
  const listCategories = []
  const idCategories = []

  await fetch("https://tienda.mercadona.es/api/categories/")
    .then(data => data.json())
    .then(categories => {
      categories.results.forEach(cat => {
        listCategories.push({
          id: cat.id,
          nombre: cat.name,
          isMainPrimary: null,
          icon: null // Añadir manualmente el icono
        })
        idCategories.push(cat.id)

        cat.categories.forEach(c => {
          listCategories.push({
            id: c.id,
            nombre: c.name,
            isMainPrimary: cat.id,
            icon: null // No tienen icono
          })
          idCategories.push(c.id)
        })
      })
    })


  switch (output) {
    case ("log"):
      console.log(listCategories.sort((a, b) => a.id > b.id ? 1 : -1))
      break
    case ("file"):
      fs.writeFileSync("categories.json", JSON.stringify(listCategories.sort((a, b) => a.id > b.id ? 1 : -1), null, 2))
      break
    default:
      console.log("Pasa 'log' o 'file' a la función para mostrar o guardar la información.")
      break
  }

  return idCategories.sort((a, b) => a > b ? 1 : -1)
}

async function loadProducts() {
  const listProducts = []
  const idCategories = await loadCategories()

  for (const id of idCategories) {
    await fetch(`https://tienda.mercadona.es/api/categories/${id}/`)
      .then(data => data.json())
      .then(products => {
        console.log(id)
        products.categories?.forEach(pro => {
          pro.products.forEach(pr => {
            listProducts.push({
              idCategoria: id,
              id: pr.id,
              name: pr.display_name,
              packaging: pr.packaging,
              reference_format: pr.price_instructions.reference_format,
              reference_price: pr.price_instructions.reference_price,
              unit_price: pr.price_instructions.unit_price,
              unit_size: pr.price_instructions.unit_size,
              image: pr.thumbnail.replaceAll("h=300&w=300", "h=100&w=100")
            })
          })
        })
      })
  }

  //console.log(listProducts.sort((a, b) => a.id > b.id ? 1 : -1))
  fs.writeFileSync("products.json", JSON.stringify(listProducts.sort((a, b) => a.id > b.id ? 1 : -1), null, 2))
}

//loadCategories()
loadProducts()