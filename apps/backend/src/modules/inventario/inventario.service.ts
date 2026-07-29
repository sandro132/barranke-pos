import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { TipoMovimientoInventario } from "@barranke/shared";

/**
 * FUNCIÓN CENTRAL DEL SISTEMA DE INVENTARIO.
 *
 * Descuenta automáticamente el inventario correspondiente al vender `cantidad`
 * unidades de un producto:
 *
 *  - Si el producto TIENE receta (ej. Margarita, Hamburguesa): descuenta cada
 *    ingrediente de la receta multiplicado por la cantidad vendida.
 *  - Si el producto NO TIENE receta (ej. una cerveza, que se vende tal cual):
 *    descuenta directamente el stock del producto.
 *
 * Todo ocurre dentro de una transacción: o se descuenta todo correctamente,
 * o no se descuenta nada (para nunca dejar el inventario en un estado a medias
 * si algo falla a mitad de camino, ej. un ingrediente sin stock suficiente).
 *
 * Esta función será usada por el módulo de Pedidos en la Fase 3 al cerrar una venta.
 * Por ahora se expone también vía POST /api/inventario/simular-venta para poder
 * probarla de forma aislada.
 */
export async function descontarInventarioPorVenta(productoId: string, cantidad: number) {
  return prisma.$transaction(async (tx) => {
    const producto = await tx.producto.findUnique({
      where: { id: productoId },
      include: { receta: { include: { ingrediente: true } } },
    });

    if (!producto) {
      throw new AppError("Producto no encontrado", 404);
    }

    if (!producto.activo) {
      throw new AppError("El producto está inactivo, no se puede vender", 400);
    }

    if (producto.receta.length > 0) {
      return descontarPorReceta(tx, producto, cantidad);
    }

    return descontarStockDirecto(tx, producto, cantidad);
  });
}

async function descontarPorReceta(
  tx: Prisma.TransactionClient,
  producto: Prisma.ProductoGetPayload<{ include: { receta: { include: { ingrediente: true } } } }>,
  cantidadVendida: number
) {
  // Primero valida que TODOS los ingredientes tengan stock suficiente,
  // antes de descontar ninguno. Evita descuentos parciales.
  for (const item of producto.receta) {
    const requerido = Number(item.cantidad) * cantidadVendida;
    const disponible = Number(item.ingrediente.stock);

    if (disponible < requerido) {
      throw new AppError(
        `Stock insuficiente de "${item.ingrediente.nombre}" para vender ${cantidadVendida}x "${producto.nombre}". ` +
          `Requerido: ${requerido} ${item.ingrediente.unidad}, disponible: ${disponible} ${item.ingrediente.unidad}.`,
        400
      );
    }
  }

  const movimientos = [];

  for (const item of producto.receta) {
    const requerido = Number(item.cantidad) * cantidadVendida;

    await tx.ingrediente.update({
      where: { id: item.ingredienteId },
      data: { stock: { decrement: requerido } },
    });

    const movimiento = await tx.movimientoInventario.create({
      data: {
        tipo: TipoMovimientoInventario.VENTA,
        cantidad: requerido,
        motivo: `Venta de ${cantidadVendida}x ${producto.nombre}`,
        ingredienteId: item.ingredienteId,
      },
    });

    movimientos.push(movimiento);
  }

  return {
    producto: { id: producto.id, nombre: producto.nombre },
    tipoDescuento: "receta" as const,
    movimientos,
  };
}

async function descontarStockDirecto(
  tx: Prisma.TransactionClient,
  producto: { id: string; nombre: string; stock: Prisma.Decimal },
  cantidadVendida: number
) {
  const disponible = Number(producto.stock);

  if (disponible < cantidadVendida) {
    throw new AppError(
      `Stock insuficiente de "${producto.nombre}". Requerido: ${cantidadVendida}, disponible: ${disponible}.`,
      400
    );
  }

  await tx.producto.update({
    where: { id: producto.id },
    data: { stock: { decrement: cantidadVendida } },
  });

  const movimiento = await tx.movimientoInventario.create({
    data: {
      tipo: TipoMovimientoInventario.VENTA,
      cantidad: cantidadVendida,
      motivo: `Venta directa de ${producto.nombre}`,
      productoId: producto.id,
    },
  });

  return {
    producto: { id: producto.id, nombre: producto.nombre },
    tipoDescuento: "stock_directo" as const,
    movimientos: [movimiento],
  };
}

export async function listarMovimientos(limite = 100) {
  return prisma.movimientoInventario.findMany({
    orderBy: { fecha: "desc" },
    take: limite,
    include: { producto: true, ingrediente: true },
  });
}
