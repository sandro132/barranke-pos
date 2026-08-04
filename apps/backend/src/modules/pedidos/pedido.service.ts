import { Prisma, ItemPedido } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { AreaPreparacion, EstadoEspacio, EstadoPedido, SOCKET_EVENTS } from "@barranke/shared";
import { getIO } from "../../sockets/socketServer";
import { ejecutarDescuentoVenta } from "../inventario/inventario.service";
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
  espacio: true,
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
  const espacio = await prisma.espacio.findUnique({ where: { id: data.espacioId } });

  if (!espacio) {
    throw new AppError("Espacio no encontrado", 404);
  }

  if (espacio.estado !== EstadoEspacio.OCUPADA) {
    throw new AppError(
      "Debes abrir la mesa/barra antes de enviar un pedido",
      400
    );
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

  const pedidoId = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Calcula primero los estados iniciales de cada ítem (según si necesita
    // preparación o no), para poder crear el pedido ya con su estado agregado
    // correcto desde el principio — en vez de asumir PENDIENTE y esperar a que
    // alguien en cocina/barra lo cambie (un pedido de solo cervezas nunca
    // pasaría por ahí, y se quedaría en PENDIENTE para siempre).
    const estadosIniciales = data.items.map((item) => {
      const producto = productosPorId.get(item.productoId)!;
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
        espacioId: data.espacioId,
        usuarioId,
        estado: calcularEstadoAgregado(estadosIniciales.map((e) => e.estado)),
      },
    });

    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      const producto = productosPorId.get(item.productoId)!;
      const { areaPreparacion, estado } = estadosIniciales[i];

      await tx.itemPedido.create({
        data: {
          pedidoId: pedido.id,
          productoId: producto.id,
          cantidad: item.cantidad,
          precioUnitario: producto.precio,
          areaPreparacion,
          estado,
          notas: item.notas,
        },
      });

      // Descuenta el inventario (receta o stock directo) dentro de esta misma transacción.
      await ejecutarDescuentoVenta(tx, producto.id, item.cantidad);
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
 * Solo trae los pedidos de la SESIÓN ACTUAL de la mesa/barra (desde que se abrió
 * esta vez), no todo su historial. Usa la misma regla que el cálculo de "total
 * consumido" en espacio.service.ts, para que ambos siempre coincidan.
 * Si el espacio está libre (sin sesión activa), no hay "pedidos de esta sesión".
 */
export async function listarPorEspacio(espacioId: string) {
  const espacio = await prisma.espacio.findUnique({ where: { id: espacioId } });

  if (!espacio) {
    throw new AppError("Espacio no encontrado", 404);
  }

  if (espacio.estado !== EstadoEspacio.OCUPADA || !espacio.horaApertura) {
    return [];
  }

  return prisma.pedido.findMany({
    where: { espacioId, createdAt: { gte: espacio.horaApertura } },
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
    include: { producto: true, pedido: { include: { espacio: true } } },
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
    include: { producto: true, pedido: { include: { espacio: true } } },
    orderBy: { pedido: { createdAt: "asc" } },
  });
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
    include: { producto: true },
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
 * Repite el último pedido enviado a un espacio (misma lista de productos y cantidades),
 * recalculando precios actuales y volviendo a descontar inventario.
 */
export async function repetirUltimaRonda(espacioId: string, usuarioId: string) {
  const ultimoPedido = await prisma.pedido.findFirst({
    where: { espacioId, estado: { not: EstadoPedido.CANCELADO } },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  if (!ultimoPedido || ultimoPedido.items.length === 0) {
    throw new AppError("No hay una ronda previa en este espacio para repetir", 400);
  }

  return crearPedido(usuarioId, {
    espacioId,
    items: ultimoPedido.items.map((i: ItemPedido) => ({
      productoId: i.productoId,
      cantidad: i.cantidad,
      notas: i.notas ?? undefined,
    })),
  });
}
