import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { TipoMovimientoInventario } from "@barranke/shared";
import { RegistrarConsumoInternoInput } from "./consumo-interno.schema";

/**
 * Registra que alguien del personal se tomó/comió algo sin pagarlo:
 * descuenta el stock (de un producto o un ingrediente, nunca ambos) y deja
 * un MovimientoInventario tipo CONSUMO_INTERNO con quién fue y por qué,
 * separado por completo de las ventas reales.
 */
export async function registrarConsumoInterno(usuarioId: string, data: RegistrarConsumoInternoInput) {
  return prisma.$transaction(async (tx) => {
    if (data.productoId) {
      const producto = await tx.producto.findUnique({ where: { id: data.productoId } });
      if (!producto) throw new AppError("Producto no encontrado", 404);
      if (Number(producto.stock) < data.cantidad) {
        throw new AppError(`Stock insuficiente de "${producto.nombre}"`, 400);
      }
      await tx.producto.update({
        where: { id: data.productoId },
        data: { stock: { decrement: data.cantidad } },
      });
    } else {
      const ingrediente = await tx.ingrediente.findUnique({ where: { id: data.ingredienteId } });
      if (!ingrediente) throw new AppError("Ingrediente no encontrado", 404);
      if (Number(ingrediente.stock) < data.cantidad) {
        throw new AppError(`Stock insuficiente de "${ingrediente.nombre}"`, 400);
      }
      await tx.ingrediente.update({
        where: { id: data.ingredienteId },
        data: { stock: { decrement: data.cantidad } },
      });
    }

    return tx.movimientoInventario.create({
      data: {
        tipo: TipoMovimientoInventario.CONSUMO_INTERNO,
        cantidad: data.cantidad,
        motivo: data.motivo,
        productoId: data.productoId,
        ingredienteId: data.ingredienteId,
        usuarioId,
      },
      include: { producto: true, ingrediente: true, usuario: { select: { id: true, nombre: true } } },
    });
  });
}

export async function listarConsumoInterno(desde?: string, hasta?: string) {
  const desdeDate = desde ? new Date(`${desde}T00:00:00`) : undefined;
  const hastaDate = hasta ? new Date(`${hasta}T23:59:59.999`) : undefined;

  return prisma.movimientoInventario.findMany({
    where: {
      tipo: TipoMovimientoInventario.CONSUMO_INTERNO,
      fecha: { gte: desdeDate, lte: hastaDate },
    },
    include: {
      producto: { select: { nombre: true, costo: true } },
      ingrediente: { select: { nombre: true, costoUnitario: true } },
      usuario: { select: { id: true, nombre: true } },
    },
    orderBy: { fecha: "desc" },
  });
}
