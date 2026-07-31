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
