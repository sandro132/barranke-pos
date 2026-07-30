import { Pedido, ItemPedido } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { EstadoEspacio, EstadoPedido, TipoEspacio } from "@barranke/shared";
import { getIO } from "../../sockets/socketServer";
import { SOCKET_EVENTS } from "@barranke/shared";
import {
  AbrirEspacioInput,
  ActualizarEspacioInput,
  CrearEspacioInput,
} from "./espacio.schema";

type PedidoConItems = Pedido & { items: ItemPedido[] };

/**
 * Calcula el total consumido y el tiempo abierta de un espacio ocupado,
 * sumando los ítems de los pedidos creados desde que se abrió la mesa/barra
 * (createdAt >= horaApertura), excluyendo pedidos cancelados.
 */
async function conDetalleDeConsumo(espacio: {
  id: string;
  horaApertura: Date | null;
  estado: string;
}) {
  if (espacio.estado !== EstadoEspacio.OCUPADA || !espacio.horaApertura) {
    return { ...espacio, totalConsumido: 0, tiempoAbiertaMinutos: 0 };
  }

  const pedidos: PedidoConItems[] = await prisma.pedido.findMany({
    where: {
      espacioId: espacio.id,
      createdAt: { gte: espacio.horaApertura },
      estado: { not: EstadoPedido.CANCELADO },
    },
    include: { items: true },
  });

  const totalConsumido = pedidos.reduce((total: number, pedido: PedidoConItems) => {
    const totalPedido = pedido.items.reduce(
      (sub: number, item: ItemPedido) => sub + Number(item.precioUnitario) * item.cantidad,
      0
    );
    return total + totalPedido;
  }, 0);

  const tiempoAbiertaMinutos = Math.floor(
    (Date.now() - espacio.horaApertura.getTime()) / 60000
  );

  return { ...espacio, totalConsumido, tiempoAbiertaMinutos };
}

export async function listarEspacios(tipo?: TipoEspacio) {
  const espacios = await prisma.espacio.findMany({
    where: { tipo },
    orderBy: { nombre: "asc" },
  });

  return Promise.all(espacios.map((e: { id: string; horaApertura: Date | null; estado: string }) => conDetalleDeConsumo(e)));
}

export async function obtenerEspacioPorId(id: string) {
  const espacio = await prisma.espacio.findUnique({ where: { id } });

  if (!espacio) {
    throw new AppError("Espacio no encontrado", 404);
  }

  return conDetalleDeConsumo(espacio);
}

export async function crearEspacio(data: CrearEspacioInput) {
  return prisma.espacio.create({
    data: {
      nombre: data.nombre,
      tipo: data.tipo,
      capacidad: data.capacidad,
    },
  });
}

export async function actualizarEspacio(id: string, data: ActualizarEspacioInput) {
  await obtenerEspacioPorId(id);

  return prisma.espacio.update({ where: { id }, data });
}

export async function abrirEspacio(id: string, data: AbrirEspacioInput) {
  const espacio = await prisma.espacio.findUnique({ where: { id } });

  if (!espacio) {
    throw new AppError("Espacio no encontrado", 404);
  }

  if (espacio.estado === EstadoEspacio.OCUPADA) {
    throw new AppError("Este espacio ya está ocupado", 400);
  }

  const actualizado = await prisma.espacio.update({
    where: { id },
    data: {
      estado: EstadoEspacio.OCUPADA,
      horaApertura: new Date(),
      descripcion: data.descripcion,
    },
  });

  getIO().emit(SOCKET_EVENTS.ESPACIO_ACTUALIZADO, actualizado);

  return actualizado;
}

export async function cerrarEspacio(id: string) {
  const espacio = await prisma.espacio.findUnique({ where: { id } });

  if (!espacio) {
    throw new AppError("Espacio no encontrado", 404);
  }

  if (espacio.estado !== EstadoEspacio.OCUPADA) {
    throw new AppError("Este espacio no está ocupado", 400);
  }

  // NOTA: el cierre de cuenta (generar Venta y registrar en Caja) se implementa
  // en la Fase 8. Por ahora cerrar el espacio solo lo libera para la siguiente mesa.
  const actualizado = await prisma.espacio.update({
    where: { id },
    data: {
      estado: EstadoEspacio.LIBRE,
      horaApertura: null,
      descripcion: null,
    },
  });

  getIO().emit(SOCKET_EVENTS.ESPACIO_ACTUALIZADO, actualizado);

  return actualizado;
}
