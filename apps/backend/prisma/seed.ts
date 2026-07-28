import { PrismaClient } from "@prisma/client";
import { CategoriaProducto, UnidadMedida, TipoEspacio } from "@barranke/shared";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Genera el siguiente código interno (SKU) disponible para una categoría.
 * Ej: CERV-001, CERV-002, COCT-001...
 * Esta misma función se reutilizará en el módulo de Productos (Fase 2).
 */
const PREFIJOS: Record<CategoriaProducto, string> = {
  CERVEZA: "CERV",
  LICOR: "LICO",
  COMIDA: "COMI",
  COCTEL: "COCT",
  OTRO: "OTRO",
};

async function siguienteSku(categoria: CategoriaProducto, contador: number) {
  const prefijo = PREFIJOS[categoria];
  return `${prefijo}-${String(contador).padStart(3, "0")}`;
}

async function main() {
  console.log("🌱 Sembrando datos de Barranke Rock Café Bar...");

  // ---- Usuario admin de prueba ----
  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.usuario.upsert({
    where: { email: "admin@barranke.com" },
    update: {},
    create: {
      nombre: "Admin Barranke",
      email: "admin@barranke.com",
      password: passwordHash,
      rol: "ADMIN",
    },
  });
  console.log("✔ Usuario admin creado (admin@barranke.com / admin123)");

  // ---- Espacios: 5 mesas + 6 barras (1 con ventana a la calle) ----
  for (let i = 1; i <= 5; i++) {
    await prisma.espacio.upsert({
      where: { id: `mesa-seed-${i}` },
      update: {},
      create: { id: `mesa-seed-${i}`, nombre: `Mesa ${i}`, tipo: TipoEspacio.MESA },
    });
  }

  const nombresBarras = ["Barra Ventana", "Barra 2", "Barra 3", "Barra 4", "Barra 5", "Barra 6"];
  for (let i = 0; i < nombresBarras.length; i++) {
    await prisma.espacio.upsert({
      where: { id: `barra-seed-${i + 1}` },
      update: {},
      create: { id: `barra-seed-${i + 1}`, nombre: nombresBarras[i], tipo: TipoEspacio.BARRA },
    });
  }
  console.log("✔ 5 mesas y 6 barras creadas");

  // ---- Ingredientes base ----
  const ingredientes = [
    { nombre: "Pan de hamburguesa", unidad: UnidadMedida.UNIDAD, stock: 100, stockMinimo: 20 },
    { nombre: "Carne de hamburguesa", unidad: UnidadMedida.UNIDAD, stock: 100, stockMinimo: 20 },
    { nombre: "Queso", unidad: UnidadMedida.GRAMO, stock: 5000, stockMinimo: 500 },
    { nombre: "Lechuga", unidad: UnidadMedida.GRAMO, stock: 3000, stockMinimo: 300 },
    { nombre: "Tomate", unidad: UnidadMedida.GRAMO, stock: 3000, stockMinimo: 300 },
    { nombre: "Tequila", unidad: UnidadMedida.MILILITRO, stock: 3000, stockMinimo: 500 },
    { nombre: "Limón", unidad: UnidadMedida.MILILITRO, stock: 3000, stockMinimo: 500 },
    { nombre: "Sirope", unidad: UnidadMedida.MILILITRO, stock: 2000, stockMinimo: 300 },
    { nombre: "Sal", unidad: UnidadMedida.GRAMO, stock: 2000, stockMinimo: 200 },
    { nombre: "Gin", unidad: UnidadMedida.MILILITRO, stock: 3000, stockMinimo: 500 },
    { nombre: "Agua tónica", unidad: UnidadMedida.MILILITRO, stock: 3000, stockMinimo: 500 },
  ];

  const ingredientesCreados: Record<string, string> = {};
  for (const ing of ingredientes) {
    const creado = await prisma.ingrediente.upsert({
      where: { id: `ing-seed-${ing.nombre}` },
      update: {},
      create: { id: `ing-seed-${ing.nombre}`, ...ing },
    });
    ingredientesCreados[ing.nombre] = creado.id;
  }
  console.log("✔ Ingredientes base creados");

  // ---- Productos: cervezas (venta directa, sin receta) ----
  const cervezas = [
    "Poker",
    "Pilsen",
    "Club Colombia",
    "Águila",
    "Águila Light",
    "Costeña",
    "Costeñita",
    "3 Cordilleras",
    "BBC",
  ];

  let contadorCerveza = 1;
  for (const nombre of cervezas) {
    const sku = await siguienteSku(CategoriaProducto.CERVEZA, contadorCerveza++);
    await prisma.producto.upsert({
      where: { codigoInterno: sku },
      update: {},
      create: {
        nombre,
        categoria: CategoriaProducto.CERVEZA,
        precio: 8000,
        costo: 4000,
        stock: 50,
        unidad: "botella",
        codigoInterno: sku,
      },
    });
  }
  console.log("✔ Cervezas creadas");

  // ---- Productos: comida (con receta) ----
  const sku1 = await siguienteSku(CategoriaProducto.COMIDA, 1);
  const hamburguesa = await prisma.producto.upsert({
    where: { codigoInterno: sku1 },
    update: {},
    create: {
      nombre: "Hamburguesa Clásica",
      categoria: CategoriaProducto.COMIDA,
      precio: 22000,
      costo: 9000,
      stock: 0,
      unidad: "unidad",
      codigoInterno: sku1,
    },
  });

  const recetaHamburguesa = [
    { nombre: "Pan de hamburguesa", cantidad: 1 },
    { nombre: "Carne de hamburguesa", cantidad: 1 },
    { nombre: "Queso", cantidad: 30 },
    { nombre: "Lechuga", cantidad: 20 },
    { nombre: "Tomate", cantidad: 30 },
  ];

  for (const item of recetaHamburguesa) {
    await prisma.recetaItem.upsert({
      where: {
        productoId_ingredienteId: {
          productoId: hamburguesa.id,
          ingredienteId: ingredientesCreados[item.nombre],
        },
      },
      update: {},
      create: {
        productoId: hamburguesa.id,
        ingredienteId: ingredientesCreados[item.nombre],
        cantidad: item.cantidad,
      },
    });
  }
  console.log("✔ Hamburguesa Clásica + receta creada");

  // ---- Productos: cócteles (con receta) ----
  const sku2 = await siguienteSku(CategoriaProducto.COCTEL, 1);
  const margarita = await prisma.producto.upsert({
    where: { codigoInterno: sku2 },
    update: {},
    create: {
      nombre: "Margarita",
      categoria: CategoriaProducto.COCTEL,
      precio: 18000,
      costo: 6000,
      stock: 0,
      unidad: "unidad",
      codigoInterno: sku2,
    },
  });

  const recetaMargarita = [
    { nombre: "Tequila", cantidad: 60 },
    { nombre: "Limón", cantidad: 30 },
    { nombre: "Sirope", cantidad: 15 },
    { nombre: "Sal", cantidad: 2 },
  ];

  for (const item of recetaMargarita) {
    await prisma.recetaItem.upsert({
      where: {
        productoId_ingredienteId: {
          productoId: margarita.id,
          ingredienteId: ingredientesCreados[item.nombre],
        },
      },
      update: {},
      create: {
        productoId: margarita.id,
        ingredienteId: ingredientesCreados[item.nombre],
        cantidad: item.cantidad,
      },
    });
  }
  console.log("✔ Margarita + receta creada");

  const sku3 = await siguienteSku(CategoriaProducto.COCTEL, 2);
  const ginTonic = await prisma.producto.upsert({
    where: { codigoInterno: sku3 },
    update: {},
    create: {
      nombre: "Gin Tonic",
      categoria: CategoriaProducto.COCTEL,
      precio: 20000,
      costo: 7000,
      stock: 0,
      unidad: "unidad",
      codigoInterno: sku3,
    },
  });

  const recetaGinTonic = [
    { nombre: "Gin", cantidad: 50 },
    { nombre: "Agua tónica", cantidad: 120 },
  ];

  for (const item of recetaGinTonic) {
    await prisma.recetaItem.upsert({
      where: {
        productoId_ingredienteId: {
          productoId: ginTonic.id,
          ingredienteId: ingredientesCreados[item.nombre],
        },
      },
      update: {},
      create: {
        productoId: ginTonic.id,
        ingredienteId: ingredientesCreados[item.nombre],
        cantidad: item.cantidad,
      },
    });
  }
  console.log("✔ Gin Tonic + receta creada");

  console.log("🎸 Seed completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
