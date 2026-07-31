import { Pedido, ItemPedido, Prisma } from "@prisma/client";
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
 * Trae los pedidos de la SESIÓN ACTUAL de un espacio (desde que se abrió,
 * sin contar cancelados). Es la ÚNICA fuente de verdad de "qué incluye esta
 * cuenta": la usan el cálculo del total en pantalla, la generación de la
 * Venta al cerrar, y el vínculo pedidos→venta para reconstruir el ticket después.
 */
async function obtenerPedidosDeSesion(
  espacioId: string,
  horaApertura: Date
): Promise<PedidoConItems[]> {
  return prisma.pedido.findMany({
    where: {
      espacioId,
      createdAt: { gte: horaApertura },
      estado: { not: EstadoPedido.CANCELADO },
    },
    include: { items: true },
  });
}

function calcularTotalDePedidos(pedidos: PedidoConItems[]): number {
  return pedidos.reduce((total: number, pedido: PedidoConItems) => {
    const totalPedido = pedido.items.reduce(
      (sub: number, item: ItemPedido) => sub + Number(item.precioUnitario) * item.cantidad,
      0
    );
    return total + totalPedido;
  }, 0);
}

async function calcularTotalConsumido(espacioId: string, horaApertura: Date): Promise<number> {
  const pedidos = await obtenerPedidosDeSesion(espacioId, horaApertura);
  return calcularTotalDePedidos(pedidos);
}

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

  const totalConsumido = await calcularTotalConsumido(espacio.id, espacio.horaApertura);

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

/**
 * Cierra un espacio: si tuvo consumo, genera una Venta real con el método de
 * pago indicado. Si hay una caja abierta en este momento, también registra el
 * movimiento de esa venta en la caja (para que el arqueo del día cuadre).
 * Si el espacio se abrió por error y no tuvo consumo, simplemente se libera
 * sin generar una venta de $0.
 */
export async function cerrarEspacio(id: string, usuarioId: string, metodoPago?: string) {
  const espacio = await prisma.espacio.findUnique({ where: { id } });

  if (!espacio) {
    throw new AppError("Espacio no encontrado", 404);
  }

  if (espacio.estado !== EstadoEspacio.OCUPADA) {
    throw new AppError("Este espacio no está ocupado", 400);
  }

  const pedidosDeSesion = espacio.horaApertura
    ? await obtenerPedidosDeSesion(espacio.id, espacio.horaApertura)
    : [];
  const total = calcularTotalDePedidos(pedidosDeSesion);

  if (total > 0 && !metodoPago) {
    throw new AppError("Selecciona un método de pago para cerrar la cuenta", 400);
  }

  const { espacioActualizado, venta } = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    let venta = null;

    if (total > 0) {
      const cajaAbierta = await tx.caja.findFirst({ where: { abierta: true } });

      venta = await tx.venta.create({
        data: {
          espacioId: espacio.id,
          usuarioId,
          subtotal: total,
          descuento: 0,
          total,
          metodoPago: metodoPago!,
          cajaId: cajaAbierta?.id ?? null,
        },
      });

      // Vincula los pedidos de esta sesión a la venta recién creada, para poder
      // reconstruir el ticket (qué productos incluía) en cualquier momento después.
      await tx.pedido.updateMany({
        where: { id: { in: pedidosDeSesion.map((p) => p.id) } },
        data: { ventaId: venta.id },
      });

      if (cajaAbierta) {
        await tx.movimientoCaja.create({
          data: {
            cajaId: cajaAbierta.id,
            tipo: "VENTA",
            monto: total,
            descripcion: `Venta — ${espacio.nombre}`,
            usuarioId,
          },
        });
      }
    }

    const espacioActualizado = await tx.espacio.update({
      where: { id },
      data: {
        estado: EstadoEspacio.LIBRE,
        horaApertura: null,
        descripcion: null,
      },
    });

    return { espacioActualizado, venta };
  });

  getIO().emit(SOCKET_EVENTS.ESPACIO_ACTUALIZADO, espacioActualizado);

  return { espacio: espacioActualizado, venta };
}
