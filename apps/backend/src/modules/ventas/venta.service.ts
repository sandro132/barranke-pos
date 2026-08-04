import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { EstadoPedido } from "@barranke/shared";

interface LineaTicket {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

/**
 * Reconstruye el ticket de una venta a partir de los pedidos que quedaron
 * vinculados a ella al momento del cierre (ver espacio.service.ts). Agrupa
 * los ítems por producto: si la mesa pidió Poker en dos rondas distintas,
 * el ticket muestra una sola línea "2x Poker", no dos líneas separadas.
 */
export async function obtenerTicket(ventaId: string) {
  const venta = await prisma.venta.findUnique({
    where: { id: ventaId },
    include: {
      espacio: { select: { nombre: true } },
      usuario: { select: { id: true, nombre: true } },
      pedidos: {
        include: { items: { include: { producto: { select: { nombre: true } } } } },
      },
    },
  });

  if (!venta) {
    throw new AppError("Venta no encontrada", 404);
  }

  const itemsPorProducto = new Map<string, LineaTicket>();

  for (const pedido of venta.pedidos) {
    for (const item of pedido.items) {
      if (item.estado === EstadoPedido.CANCELADO) continue;

      const precioUnitario = Number(item.precioUnitario);
      const subtotalItem = precioUnitario * item.cantidad;
      const existente = itemsPorProducto.get(item.productoId);

      if (existente) {
        existente.cantidad += item.cantidad;
        existente.subtotal += subtotalItem;
      } else {
        itemsPorProducto.set(item.productoId, {
          nombre: item.producto.nombre,
          cantidad: item.cantidad,
          precioUnitario,
          subtotal: subtotalItem,
        });
      }
    }
  }

  return {
    id: venta.id,
    fecha: venta.fecha,
    espacio: venta.espacio.nombre,
    usuario: venta.usuario.nombre,
    metodoPago: venta.metodoPago,
    subtotal: Number(venta.subtotal),
    descuento: Number(venta.descuento),
    total: Number(venta.total),
    items: Array.from(itemsPorProducto.values()),
  };
}

/**
 * Lista TODAS las ventas, tengan o no una caja asociada (una venta puede
 * quedar sin caja si se cerró una mesa sin haber abierto caja ese día).
 * Es la única forma de encontrar esas ventas "sueltas" — desde una caja
 * específica nunca aparecerían.
 */
export async function listarVentas(desde?: string, hasta?: string) {
  const desdeDate = desde ? new Date(`${desde}T00:00:00`) : undefined;
  const hastaDate = hasta ? new Date(`${hasta}T23:59:59.999`) : undefined;

  return prisma.venta.findMany({
    where: {
      fecha: {
        gte: desdeDate,
        lte: hastaDate,
      },
    },
    include: {
      espacio: { select: { id: true, nombre: true } },
      cliente: { select: { id: true, nombre: true } },
      caja: { select: { id: true, abierta: true } },
    },
    orderBy: { fecha: "desc" },
    take: 300,
  });
}

/**
 * Anula una venta hecha por error (o de prueba), revirtiendo todo lo que
 * generó al crearla:
 *  - Si tenía un movimiento de caja asociado (venta en efectivo/transferencia/
 *    etc. con caja abierta), lo borra — así el "efectivo esperado" del
 *    arqueo vuelve a cuadrar sin ese dinero que nunca debió contarse.
 *  - Si era fiado, borra el cargo de la cuenta del cliente — su saldo baja
 *    automáticamente, sin tocar nada a mano.
 *  - Los pedidos que estaban vinculados a esta venta quedan sueltos (no se
 *    borran ni se restaura el inventario: ya se descontó cuando se armó el
 *    pedido, no cuando se cerró la cuenta, así que anular la venta no debe
 *    devolver el inventario).
 */
export async function anularVenta(ventaId: string) {
  const venta = await prisma.venta.findUnique({
    where: { id: ventaId },
    include: { movimientoCaja: true, movimientoCuenta: true },
  });

  if (!venta) {
    throw new AppError("Venta no encontrada", 404);
  }

  await prisma.$transaction(async (tx) => {
    await tx.pedido.updateMany({
      where: { ventaId },
      data: { ventaId: null },
    });

    if (venta.movimientoCuenta) {
      await tx.movimientoCuentaCliente.delete({ where: { id: venta.movimientoCuenta.id } });
    }

    if (venta.movimientoCaja) {
      await tx.movimientoCaja.delete({ where: { id: venta.movimientoCaja.id } });
    }

    await tx.venta.delete({ where: { id: ventaId } });
  });
}
