import { Prisma, Producto, Ingrediente } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { TipoMovimientoInventario } from "@barranke/shared";
import { CrearCompraInput } from "./compra.schema";

const INCLUDE_COMPRA_COMPLETA = {
  items: { include: { producto: true, ingrediente: true } },
} satisfies Prisma.CompraInclude;

export async function listarCompras() {
  return prisma.compra.findMany({
    include: INCLUDE_COMPRA_COMPLETA,
    orderBy: { fecha: "desc" },
  });
}

export async function obtenerCompra(id: string) {
  const compra = await prisma.compra.findUnique({
    where: { id },
    include: INCLUDE_COMPRA_COMPLETA,
  });

  if (!compra) {
    throw new AppError("Compra no encontrada", 404);
  }

  return compra;
}

/**
 * Registra una compra y, en la misma transacción, actualiza el inventario:
 * sube el stock del producto o ingrediente comprado, actualiza su costo al
 * costo más reciente, y deja un MovimientoInventario tipo COMPRA para
 * trazabilidad (se puede distinguir de un ajuste manual o de una venta).
 */
export async function crearCompra(data: CrearCompraInput) {
  const productoIds = data.items.filter((i) => i.productoId).map((i) => i.productoId!);
  const ingredienteIds = data.items.filter((i) => i.ingredienteId).map((i) => i.ingredienteId!);

  const [productos, ingredientes]: [Producto[], Ingrediente[]] = await Promise.all([
    productoIds.length ? prisma.producto.findMany({ where: { id: { in: productoIds } } }) : [],
    ingredienteIds.length
      ? prisma.ingrediente.findMany({ where: { id: { in: ingredienteIds } } })
      : [],
  ]);

  const productosPorId = new Map(productos.map((p) => [p.id, p]));
  const ingredientesPorId = new Map(ingredientes.map((i) => [i.id, i]));

  for (const item of data.items) {
    if (item.productoId && !productosPorId.has(item.productoId)) {
      throw new AppError(`Producto no encontrado`, 404);
    }
    if (item.ingredienteId && !ingredientesPorId.has(item.ingredienteId)) {
      throw new AppError(`Ingrediente no encontrado`, 404);
    }
  }

  const total = data.items.reduce((sum, i) => sum + i.cantidad * i.costoUnitario, 0);

  const compraId = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const compra = await tx.compra.create({
      data: { proveedor: data.proveedor, factura: data.factura, total },
    });

    for (const item of data.items) {
      await tx.itemCompra.create({
        data: {
          compraId: compra.id,
          productoId: item.productoId,
          ingredienteId: item.ingredienteId,
          cantidad: item.cantidad,
          costoUnitario: item.costoUnitario,
        },
      });

      if (item.productoId) {
        await tx.producto.update({
          where: { id: item.productoId },
          data: { stock: { increment: item.cantidad }, costo: item.costoUnitario },
        });
      } else if (item.ingredienteId) {
        await tx.ingrediente.update({
          where: { id: item.ingredienteId },
          data: { stock: { increment: item.cantidad }, costoUnitario: item.costoUnitario },
        });
      }

      await tx.movimientoInventario.create({
        data: {
          tipo: TipoMovimientoInventario.COMPRA,
          cantidad: item.cantidad,
          motivo: `Compra a ${data.proveedor}`,
          productoId: item.productoId,
          ingredienteId: item.ingredienteId,
        },
      });
    }

    return compra.id;
  });

  return obtenerCompra(compraId);
}
