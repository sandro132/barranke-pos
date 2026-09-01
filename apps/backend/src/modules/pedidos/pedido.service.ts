import { Prisma, ItemPedido } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { AreaPreparacion, EstadoCuenta, EstadoPedido, SOCKET_EVENTS, TipoPromocion } from "@barranke/shared";
import { getIO } from "../../sockets/socketServer";
import { ejecutarDescuentoVenta, revertirDescuentoVenta } from "../inventario/inventario.service";
import { CrearPedidoInput } from "./pedido.schema";

/**
 * Deriva el estado agregado de un pedido a partir del estado de todos sus ítems.
 * Es una función pura (no toca la base de datos) para poder usarla tanto al
 * crear el pedido (con los estados iniciales ya calculados en memoria) como
 * al sincronizar después de que cocina/barra cambian un ítem.
 */
function calcularEstadoAgregado(estadosItems: string[]): string {
  if (estadosItems.every((e) => e === EstadoPedido.CANCELADO)) {
    return EstadoPedido.CANCELADO;
  }
  if (
    estadosItems.every((e) =>
      [EstadoPedido.ENTREGADO, EstadoPedido.CANCELADO].includes(e as EstadoPedido)
    )
  ) {
    return EstadoPedido.ENTREGADO;
  }
  if (
    estadosItems.every((e) =>
      [EstadoPedido.LISTO, EstadoPedido.ENTREGADO, EstadoPedido.CANCELADO].includes(
        e as EstadoPedido
      )
    )
  ) {
    return EstadoPedido.LISTO;
  }
  if (estadosItems.some((e) => e === EstadoPedido.PREPARANDO)) {
    return EstadoPedido.PREPARANDO;
  }
  return EstadoPedido.PENDIENTE;
}

const INCLUDE_PEDIDO_COMPLETO = {
  cuenta: { include: { espacio: true } },
  usuario: { select: { id: true, nombre: true } },
  items: { include: { producto: true } },
} satisfies Prisma.PedidoInclude;

/**
 * Crea un pedido con sus ítems y, en la misma transacción, descuenta el
 * inventario correspondiente de cada ítem (ver inventario.service.ts).
 * Si cualquier ítem no tiene stock suficiente, la transacción completa
 * se revierte: no se crea un pedido "a medias".
 */
export async function crearPedido(usuarioId: string, data: CrearPedidoInput) {
  const cuenta = await prisma.cuenta.findUnique({ where: { id: data.cuentaId } });

  if (!cuenta) {
    throw new AppError("Cuenta no encontrada", 404);
  }

  if (cuenta.estado !== EstadoCuenta.ABIERTA) {
    throw new AppError("Debes abrir la cuenta antes de enviar un pedido", 400);
  }

  const productos = await prisma.producto.findMany({
    where: { id: { in: data.items.map((i) => i.productoId) } },
    include: { categoria: true },
  });
  const productosPorId = new Map(productos.map((p) => [p.id, p]));

  for (const item of data.items) {
    const producto = productosPorId.get(item.productoId);
    if (!producto) {
      throw new AppError(`Producto ${item.productoId} no encontrado`, 404);
    }
    if (!producto.activo) {
      throw new AppError(`El producto "${producto.nombre}" está inactivo`, 400);
    }
  }

  // Busca promos de combo activas para los productos del carrito (ej. "5
  // empanadas por $6.000"). Si el mesero agrega la cantidad suficiente,
  // se cobra el precio del combo automáticamente — no hay que activar nada
  // a mano. Lo que sobre de la cantidad requerida se cobra a precio normal.
  const promocionesCombo = await prisma.promocion.findMany({
    where: {
      tipo: TipoPromocion.COMBO,
      activa: true,
      productoId: { in: data.items.map((i) => i.productoId) },
    },
  });
  const comboPorProducto = new Map(promocionesCombo.map((p) => [p.productoId!, p]));

  interface LineaPedido {
    productoId: string;
    cantidad: number;
    precioUnitario: number;
    notas?: string;
  }

  const lineas: LineaPedido[] = [];
  for (const item of data.items) {
    const producto = productosPorId.get(item.productoId)!;
    const combo = comboPorProducto.get(item.productoId);

    if (combo?.cantidadRequerida && combo.precioCombo && item.cantidad >= combo.cantidadRequerida) {
      const grupos = Math.floor(item.cantidad / combo.cantidadRequerida);
      const resto = item.cantidad % combo.cantidadRequerida;
      const precioPorUnidadCombo = Number(combo.precioCombo) / combo.cantidadRequerida;

      lineas.push({
        productoId: item.productoId,
        cantidad: grupos * combo.cantidadRequerida,
        precioUnitario: precioPorUnidadCombo,
        notas: `Promo: ${combo.nombre}`,
      });
      if (resto > 0) {
        lineas.push({
          productoId: item.productoId,
          cantidad: resto,
          precioUnitario: Number(producto.precio),
          notas: item.notas,
        });
      }
    } else {
      lineas.push({
        productoId: item.productoId,
        cantidad: item.cantidad,
        precioUnitario: Number(producto.precio),
        notas: item.notas,
      });
    }
  }

  const pedidoId = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Calcula primero los estados iniciales de cada línea (según si necesita
    // preparación o no), para poder crear el pedido ya con su estado agregado
    // correcto desde el principio — en vez de asumir PENDIENTE y esperar a que
    // alguien en cocina/barra lo cambie (un pedido de solo cervezas nunca
    // pasaría por ahí, y se quedaría en PENDIENTE para siempre).
    const estadosIniciales = lineas.map((linea) => {
      const producto = productosPorId.get(linea.productoId)!;
      // El área de preparación ahora es una propiedad de la categoría misma
      // (configurable por el usuario), no una comparación de texto fija.
      const areaPreparacion = producto.categoria.areaPreparacion;
      const estado =
        areaPreparacion === AreaPreparacion.NINGUNA
          ? EstadoPedido.LISTO
          : EstadoPedido.PENDIENTE;
      return { areaPreparacion, estado };
    });

    const pedido = await tx.pedido.create({
      data: {
        cuentaId: data.cuentaId,
        usuarioId,
        estado: calcularEstadoAgregado(estadosIniciales.map((e) => e.estado)),
      },
    });

    for (let i = 0; i < lineas.length; i++) {
      const linea = lineas[i];
      const producto = productosPorId.get(linea.productoId)!;
      const { areaPreparacion, estado } = estadosIniciales[i];

      await tx.itemPedido.create({
        data: {
          pedidoId: pedido.id,
          productoId: producto.id,
          cantidad: linea.cantidad,
          precioUnitario: linea.precioUnitario,
          areaPreparacion,
          estado,
          notas: linea.notas,
        },
      });

      // Descuenta el inventario (receta o stock directo) dentro de esta misma transacción.
      await ejecutarDescuentoVenta(tx, producto.id, linea.cantidad);
    }

    return pedido.id;
  });

  const pedidoCompleto = await prisma.pedido.findUniqueOrThrow({
    where: { id: pedidoId },
    include: INCLUDE_PEDIDO_COMPLETO,
  });

  // Notifica en tiempo real: el computador/admin ve el pedido aparecer instantáneamente.
  getIO().emit(SOCKET_EVENTS.PEDIDO_NUEVO, pedidoCompleto);

  return pedidoCompleto;
}

/**
 * Trae los pedidos de una cuenta. A diferencia del viejo sistema de mesas,
 * cada pedido queda vinculado a su cuenta desde que se crea (cuentaId es un
 * vínculo estable, no un espacio reutilizado) — así que basta con filtrar
 * por cuentaId, sin trucos de rango de fechas.
 */
export async function listarPorCuenta(cuentaId: string) {
  const cuenta = await prisma.cuenta.findUnique({ where: { id: cuentaId } });

  if (!cuenta) {
    throw new AppError("Cuenta no encontrada", 404);
  }

  return prisma.pedido.findMany({
    where: { cuentaId },
    include: INCLUDE_PEDIDO_COMPLETO,
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Pantalla de Cocina: solo ítems de comida, pendientes o en preparación
 * (una vez ENTREGADO o CANCELADO, desaparecen de esta vista).
 */
export async function listarParaCocina() {
  return prisma.itemPedido.findMany({
    where: {
      areaPreparacion: AreaPreparacion.COCINA,
      estado: { in: [EstadoPedido.PENDIENTE, EstadoPedido.PREPARANDO, EstadoPedido.LISTO] },
    },
    include: { producto: true, pedido: { include: { cuenta: { include: { espacio: true } } } } },
    orderBy: { pedido: { createdAt: "asc" } },
  });
}

/**
 * Pantalla de Barra: solo bebidas PREPARADAS (cócteles). Las cervezas
 * nunca aparecen aquí porque su areaPreparacion es NINGUNA.
 */
export async function listarParaBarra() {
  return prisma.itemPedido.findMany({
    where: {
      areaPreparacion: AreaPreparacion.BARRA,
      estado: { in: [EstadoPedido.PENDIENTE, EstadoPedido.PREPARANDO, EstadoPedido.LISTO] },
    },
    include: { producto: true, pedido: { include: { cuenta: { include: { espacio: true } } } } },
    orderBy: { pedido: { createdAt: "asc" } },
  });
}

/**
 * Marca como ENTREGADO todos los ítems pendientes/en preparación/listos de
 * un área de un golpe — para cuando cocina o barra dejan de usarse por un
 * tiempo y se acumulan pedidos viejos que ya no tiene sentido ir marcando
 * uno por uno. No cancela nada (no revierte inventario ni nada de eso):
 * simplemente los da por entregados y los saca del tablero.
 */
export async function terminarTodosPendientes(area: string) {
  const items = await prisma.itemPedido.findMany({
    where: {
      areaPreparacion: area,
      estado: { in: [EstadoPedido.PENDIENTE, EstadoPedido.PREPARANDO, EstadoPedido.LISTO] },
    },
    select: { id: true, pedidoId: true },
  });

  if (items.length === 0) {
    return { actualizados: 0 };
  }

  await prisma.itemPedido.updateMany({
    where: { id: { in: items.map((i) => i.id) } },
    data: { estado: EstadoPedido.ENTREGADO },
  });

  const pedidoIds = [...new Set(items.map((i) => i.pedidoId))] as string[];
  for (const pedidoId of pedidoIds) {
    await sincronizarEstadoPedido(pedidoId);
  }

  getIO().emit(SOCKET_EVENTS.PEDIDO_ITEM_ACTUALIZADO, { masivo: true, area });

  return { actualizados: items.length };
}

/**
 * Actualiza el estado de UN ítem (ej. cocina marca "Preparando" -> "Listo"),
 * y luego sincroniza el estado general del pedido según el estado de todos sus ítems.
 */
export async function actualizarEstadoItem(itemId: string, nuevoEstado: string) {
  const item = await prisma.itemPedido.findUnique({ where: { id: itemId } });

  if (!item) {
    throw new AppError("Ítem de pedido no encontrado", 404);
  }

  const itemActualizado = await prisma.itemPedido.update({
    where: { id: itemId },
    data: { estado: nuevoEstado },
    include: { producto: true, pedido: { include: { cuenta: { include: { espacio: true } } } } },
  });

  const pedidoActualizado = await sincronizarEstadoPedido(item.pedidoId);

  getIO().emit(SOCKET_EVENTS.PEDIDO_ITEM_ACTUALIZADO, {
    item: itemActualizado,
    pedidoId: item.pedidoId,
    estadoPedido: pedidoActualizado.estado,
  });

  return itemActualizado;
}

/**
 * Cancela un ítem de un pedido que todavía no se ha pagado (mientras la
 * cuenta siga abierta): le devuelve al inventario lo que ese ítem había
 * descontado, y recalcula el estado agregado del pedido. Si la cuenta ya se
 * cerró (el pedido ya tiene una venta), no se puede — hay que anular la
 * venta completa en su lugar, para no dejar números descuadrados.
 */
export async function cancelarItem(itemId: string) {
  const item = await prisma.itemPedido.findUnique({
    where: { id: itemId },
    include: { pedido: true, producto: true },
  });

  if (!item) {
    throw new AppError("Ítem de pedido no encontrado", 404);
  }
  if (item.estado === EstadoPedido.CANCELADO) {
    throw new AppError("Este ítem ya está cancelado", 400);
  }
  if (item.pedido.ventaId) {
    throw new AppError(
      "Esta cuenta ya fue cerrada y pagada; para corregirla, anula la venta desde Caja o Ventas.",
      400
    );
  }

  const itemActualizado = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await revertirDescuentoVenta(
      tx,
      item.productoId,
      item.cantidad,
      `Cancelación de ítem — ${item.producto.nombre}`
    );

    return tx.itemPedido.update({
      where: { id: itemId },
      data: { estado: EstadoPedido.CANCELADO },
      include: { producto: true, pedido: { include: { cuenta: { include: { espacio: true } } } } },
    });
  });

  const pedidoActualizado = await sincronizarEstadoPedido(item.pedidoId);

  getIO().emit(SOCKET_EVENTS.PEDIDO_ITEM_ACTUALIZADO, {
    item: itemActualizado,
    pedidoId: item.pedidoId,
    estadoPedido: pedidoActualizado.estado,
  });

  return itemActualizado;
}

/**
 * Deriva el estado del pedido a partir del estado combinado de todos sus ítems.
 * Ej: si todos los ítems ya fueron entregados, el pedido completo pasa a ENTREGADO.
 */
async function sincronizarEstadoPedido(pedidoId: string) {
  const items: ItemPedido[] = await prisma.itemPedido.findMany({ where: { pedidoId } });
  const nuevoEstado = calcularEstadoAgregado(items.map((i) => i.estado));

  return prisma.pedido.update({
    where: { id: pedidoId },
    data: { estado: nuevoEstado },
  });
}

/**
 * Repite el último pedido enviado a una cuenta (misma lista de productos y
 * cantidades), recalculando precios actuales y volviendo a descontar inventario.
 */
export async function repetirUltimaRonda(cuentaId: string, usuarioId: string) {
  const ultimoPedido = await prisma.pedido.findFirst({
    where: { cuentaId, estado: { not: EstadoPedido.CANCELADO } },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  if (!ultimoPedido || ultimoPedido.items.length === 0) {
    throw new AppError("No hay una ronda previa en esta cuenta para repetir", 400);
  }

  return crearPedido(usuarioId, {
    cuentaId,
    items: ultimoPedido.items.map((i: ItemPedido) => ({
      productoId: i.productoId,
      cantidad: i.cantidad,
      notas: i.notas ?? undefined,
    })),
  });
}
