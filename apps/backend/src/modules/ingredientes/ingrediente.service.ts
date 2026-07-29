import { Ingrediente, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { TipoMovimientoInventario } from "@barranke/shared";
import {
  ActualizarIngredienteInput,
  AjustarStockInput,
  CrearIngredienteInput,
} from "./ingrediente.schema";

/**
 * Agrega el campo calculado `stockBajo` comparando stock actual vs stockMinimo.
 * No se guarda en base de datos: se calcula al vuelo cada vez que se lista,
 * para que siempre refleje el estado real sin necesidad de sincronizar un flag.
 */
function conAlertaStockBajo(ingrediente: Ingrediente) {
  const stock = Number(ingrediente.stock);
  const stockMinimo = Number(ingrediente.stockMinimo);
  return { ...ingrediente, stockBajo: stock <= stockMinimo };
}

export async function listarIngredientes(soloStockBajo?: boolean) {
  const ingredientes = await prisma.ingrediente.findMany({
    orderBy: { nombre: "asc" },
  });

  const conAlerta = ingredientes.map((ingrediente) => conAlertaStockBajo(ingrediente));

  return soloStockBajo ? conAlerta.filter((i) => i.stockBajo) : conAlerta;
}

export async function obtenerIngredientePorId(id: string) {
  const ingrediente = await prisma.ingrediente.findUnique({ where: { id } });

  if (!ingrediente) {
    throw new AppError("Ingrediente no encontrado", 404);
  }

  return conAlertaStockBajo(ingrediente);
}

export async function crearIngrediente(data: CrearIngredienteInput) {
  return prisma.ingrediente.create({ data });
}

export async function actualizarIngrediente(id: string, data: ActualizarIngredienteInput) {
  await obtenerIngredientePorId(id);

  return prisma.ingrediente.update({ where: { id }, data });
}

export async function eliminarIngrediente(id: string) {
  await obtenerIngredientePorId(id);

  const enUso = await prisma.recetaItem.findFirst({ where: { ingredienteId: id } });
  if (enUso) {
    throw new AppError(
      "No se puede eliminar: este ingrediente está siendo usado en una o más recetas",
      400
    );
  }

  return prisma.ingrediente.delete({ where: { id } });
}

/**
 * Ajuste manual de stock (entradas, mermas, correcciones de conteo).
 * Esto es independiente del descuento automático por venta (ver inventario.service.ts):
 * aquí es el admin ajustando el inventario a mano, con motivo obligatorio para trazabilidad.
 */
export async function ajustarStock(id: string, data: AjustarStockInput) {
  const ingrediente = await obtenerIngredientePorId(id);

  const nuevoStock = Number(ingrediente.stock) + data.cantidad;
  if (nuevoStock < 0) {
    throw new AppError(
      `El ajuste dejaría el stock en negativo (actual: ${ingrediente.stock}, ajuste: ${data.cantidad})`,
      400
    );
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const actualizado = await tx.ingrediente.update({
      where: { id },
      data: { stock: nuevoStock },
    });

    await tx.movimientoInventario.create({
      data: {
        tipo:
          data.cantidad > 0
            ? TipoMovimientoInventario.ENTRADA
            : TipoMovimientoInventario.SALIDA,
        cantidad: Math.abs(data.cantidad),
        motivo: data.motivo,
        ingredienteId: id,
      },
    });

    return actualizado;
  });
}

export async function historialMovimientos(id: string) {
  await obtenerIngredientePorId(id);

  return prisma.movimientoInventario.findMany({
    where: { ingredienteId: id },
    orderBy: { fecha: "desc" },
  });
}
