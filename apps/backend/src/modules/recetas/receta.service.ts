import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { AgregarItemRecetaInput, ActualizarItemRecetaInput } from "./receta.schema";

async function validarProductoExiste(productoId: string) {
  const producto = await prisma.producto.findUnique({ where: { id: productoId } });
  if (!producto) {
    throw new AppError("Producto no encontrado", 404);
  }
  return producto;
}

async function validarIngredienteExiste(ingredienteId: string) {
  const ingrediente = await prisma.ingrediente.findUnique({ where: { id: ingredienteId } });
  if (!ingrediente) {
    throw new AppError("Ingrediente no encontrado", 404);
  }
  return ingrediente;
}

export async function obtenerRecetaDeProducto(productoId: string) {
  await validarProductoExiste(productoId);

  return prisma.recetaItem.findMany({
    where: { productoId },
    include: { ingrediente: true },
  });
}

export async function agregarItemReceta(productoId: string, data: AgregarItemRecetaInput) {
  await validarProductoExiste(productoId);
  await validarIngredienteExiste(data.ingredienteId);

  const yaExiste = await prisma.recetaItem.findUnique({
    where: {
      productoId_ingredienteId: {
        productoId,
        ingredienteId: data.ingredienteId,
      },
    },
  });

  if (yaExiste) {
    throw new AppError(
      "Este ingrediente ya está en la receta. Usa actualizar para cambiar la cantidad.",
      400
    );
  }

  return prisma.recetaItem.create({
    data: {
      productoId,
      ingredienteId: data.ingredienteId,
      cantidad: data.cantidad,
    },
    include: { ingrediente: true },
  });
}

export async function actualizarItemReceta(
  productoId: string,
  ingredienteId: string,
  data: ActualizarItemRecetaInput
) {
  const item = await prisma.recetaItem.findUnique({
    where: { productoId_ingredienteId: { productoId, ingredienteId } },
  });

  if (!item) {
    throw new AppError("Este ingrediente no está en la receta de este producto", 404);
  }

  return prisma.recetaItem.update({
    where: { productoId_ingredienteId: { productoId, ingredienteId } },
    data: { cantidad: data.cantidad },
    include: { ingrediente: true },
  });
}

export async function eliminarItemReceta(productoId: string, ingredienteId: string) {
  const item = await prisma.recetaItem.findUnique({
    where: { productoId_ingredienteId: { productoId, ingredienteId } },
  });

  if (!item) {
    throw new AppError("Este ingrediente no está en la receta de este producto", 404);
  }

  return prisma.recetaItem.delete({
    where: { productoId_ingredienteId: { productoId, ingredienteId } },
  });
}
