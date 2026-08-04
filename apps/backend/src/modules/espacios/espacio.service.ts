import { Espacio, Pedido, ItemPedido, Prisma } from "@prisma/client";
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
type EspacioConHora = { id: string; horaApertura: Date | null };

/**
 * Trae el "grupo" de un espacio: él mismo más todas las mesas unidas a él
 * (si las tiene). Si el espacio es en sí una mesa unida a otra (tiene
 * espacioPadreId), el grupo es solo él mismo — las mesas unidas no calculan
 * su propio grupo, eso lo hace la mesa principal.
 */
async function obtenerGrupoDeEspacios(espacio: Espacio): Promise<Espacio[]> {
  if (espacio.espacioPadreId) {
    return [espacio];
  }
  const hijos = await prisma.espacio.findMany({ where: { espacioPadreId: espacio.id } });
  return [espacio, ...hijos];
}

/**
 * Trae los pedidos de la sesión actual de un GRUPO de espacios (uno o varios,
 * si hay mesas unidas). Cada espacio del grupo filtra desde SU PROPIA hora de
 * apertura (una mesa unida después conserva su propia hora, no la de la
 * mesa principal). Es la única fuente de verdad de "qué incluye esta cuenta".
 */
async function obtenerPedidosDeGrupo(grupo: EspacioConHora[]): Promise<PedidoConItems[]> {
  const conApertura = grupo.filter((e) => e.horaApertura);
  if (conApertura.length === 0) return [];

  return prisma.pedido.findMany({
    where: {
      OR: conApertura.map((e) => ({ espacioId: e.id, createdAt: { gte: e.horaApertura! } })),
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

/**
 * Calcula el total consumido y el tiempo abierta de un espacio ocupado.
 * Si el espacio tiene mesas unidas, el total incluye el consumo de todas.
 * Si el espacio ES una mesa unida a otra, no calcula su propio total (se
 * maneja desde la mesa principal) — solo indica a cuál está unida.
 */
async function conDetalleDeConsumo(espacio: Espacio) {
  if (espacio.estado !== EstadoEspacio.OCUPADA || !espacio.horaApertura) {
    return { ...espacio, totalConsumido: 0, tiempoAbiertaMinutos: 0, unidaA: null, mesasUnidas: [] as string[] };
  }

  const tiempoAbiertaMinutos = Math.floor((Date.now() - espacio.horaApertura.getTime()) / 60000);

  if (espacio.espacioPadreId) {
    const padre = await prisma.espacio.findUnique({ where: { id: espacio.espacioPadreId } });
    return {
      ...espacio,
      totalConsumido: 0,
      tiempoAbiertaMinutos,
      unidaA: padre?.nombre ?? null,
      mesasUnidas: [] as string[],
    };
  }

  const grupo = await obtenerGrupoDeEspacios(espacio);
  const pedidos = await obtenerPedidosDeGrupo(grupo);
  const totalConsumido = calcularTotalDePedidos(pedidos);
  const mesasUnidas = grupo.filter((e) => e.id !== espacio.id).map((e) => e.nombre);

  return { ...espacio, totalConsumido, tiempoAbiertaMinutos, unidaA: null, mesasUnidas };
}

export async function listarEspacios(tipo?: TipoEspacio) {
  const espacios = await prisma.espacio.findMany({
    where: { tipo },
    orderBy: { nombre: "asc" },
  });

  return Promise.all(espacios.map((e: Espacio) => conDetalleDeConsumo(e)));
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
 * Une una o más mesas ("hijas") a una mesa "principal": desde ese momento,
 * el total y el cierre de cuenta de la principal incluyen el consumo de
 * todas. Cada mesa unida sigue mostrando su propio estado OCUPADA (para que
 * un mesero no la vea libre por error), pero deja de calcular su propio total.
 * Restricciones: todas deben estar ocupadas, ninguna puede estar ya unida a
 * otra, y no se permite anidar (una mesa con mesas unidas no puede a su vez
 * unirse a otra — mantiene el modelo simple, de un solo nivel).
 */
export async function unirEspacios(padreId: string, hijoIds: string[]) {
  if (hijoIds.includes(padreId)) {
    throw new AppError("Una mesa no se puede unir consigo misma", 400);
  }

  const padre = await prisma.espacio.findUnique({ where: { id: padreId } });
  if (!padre) throw new AppError("Mesa no encontrada", 404);
  if (padre.estado !== EstadoEspacio.OCUPADA) {
    throw new AppError("La mesa principal debe estar ocupada para unir otras a ella", 400);
  }
  if (padre.espacioPadreId) {
    throw new AppError("Esta mesa ya está unida a otra; no puede ser mesa principal", 400);
  }

  const hijos = await prisma.espacio.findMany({ where: { id: { in: hijoIds } } });
  if (hijos.length !== hijoIds.length) {
    throw new AppError("Alguna de las mesas seleccionadas no existe", 404);
  }

  for (const hijo of hijos) {
    if (hijo.estado !== EstadoEspacio.OCUPADA) {
      throw new AppError(`${hijo.nombre} debe estar ocupada para unirla`, 400);
    }
    if (hijo.espacioPadreId) {
      throw new AppError(`${hijo.nombre} ya está unida a otra mesa`, 400);
    }
  }

  const tieneHijosPropios = await prisma.espacio.findFirst({
    where: { espacioPadreId: { in: hijoIds } },
  });
  if (tieneHijosPropios) {
    throw new AppError("No se pueden unir mesas que ya tienen otras mesas unidas a ellas", 400);
  }

  await prisma.espacio.updateMany({
    where: { id: { in: hijoIds } },
    data: { espacioPadreId: padreId },
  });

  const actualizado = await conDetalleDeConsumo((await prisma.espacio.findUnique({ where: { id: padreId } }))!);
  getIO().emit(SOCKET_EVENTS.ESPACIO_ACTUALIZADO, actualizado);

  return actualizado;
}

/** Desune una mesa del grupo al que estaba unida. */
export async function separarEspacio(hijoId: string) {
  const hijo = await prisma.espacio.findUnique({ where: { id: hijoId } });
  if (!hijo) throw new AppError("Espacio no encontrado", 404);
  if (!hijo.espacioPadreId) throw new AppError("Esta mesa no está unida a ninguna otra", 400);

  const actualizado = await prisma.espacio.update({
    where: { id: hijoId },
    data: { espacioPadreId: null },
  });

  getIO().emit(SOCKET_EVENTS.ESPACIO_ACTUALIZADO, actualizado);

  return conDetalleDeConsumo(actualizado);
}

/**
 * Arma la precuenta de un espacio: el detalle de lo consumido en la sesión
 * actual, itemizado por producto, SIN cerrar la mesa ni generar ninguna
 * Venta. Es solo para mostrarle al cliente cuánto va antes de pagar.
 */
export async function obtenerPrecuenta(espacioId: string) {
  const espacio = await prisma.espacio.findUnique({ where: { id: espacioId } });
  if (!espacio) throw new AppError("Espacio no encontrado", 404);

  if (espacio.espacioPadreId) {
    throw new AppError("Esta mesa está unida a otra; consulta la precuenta desde ahí", 400);
  }
  if (espacio.estado !== EstadoEspacio.OCUPADA || !espacio.horaApertura) {
    throw new AppError("Este espacio no tiene una cuenta abierta", 400);
  }

  const grupo = await obtenerGrupoDeEspacios(espacio);
  const pedidos = await prisma.pedido.findMany({
    where: {
      OR: grupo.filter((e) => e.horaApertura).map((e) => ({ espacioId: e.id, createdAt: { gte: e.horaApertura! } })),
      estado: { not: EstadoPedido.CANCELADO },
    },
    include: { items: { include: { producto: { select: { nombre: true } } } } },
  });

  const itemsPorProducto = new Map<
    string,
    { nombre: string; cantidad: number; precioUnitario: number; subtotal: number }
  >();

  for (const pedido of pedidos) {
    for (const item of pedido.items) {
      if (item.estado === EstadoPedido.CANCELADO) continue;
      const precioUnitario = Number(item.precioUnitario);
      const subtotal = precioUnitario * item.cantidad;
      const existente = itemsPorProducto.get(item.productoId);
      if (existente) {
        existente.cantidad += item.cantidad;
        existente.subtotal += subtotal;
      } else {
        itemsPorProducto.set(item.productoId, {
          nombre: item.producto.nombre,
          cantidad: item.cantidad,
          precioUnitario,
          subtotal,
        });
      }
    }
  }

  const items = Array.from(itemsPorProducto.values());
  const total = items.reduce((s, i) => s + i.subtotal, 0);
  const mesasUnidas = grupo.filter((e) => e.id !== espacio.id).map((e) => e.nombre);

  return { espacio: espacio.nombre, mesasUnidas, items, total };
}

/**
 * Cierra un espacio (y, si tiene mesas unidas, las cierra todas juntas):
 * genera una Venta real con el método de pago indicado, o varias si se
 * dividió la cuenta (ver `pagos`). Si hay una caja abierta, registra el
 * movimiento correspondiente. Si no hubo consumo, simplemente libera todo
 * sin generar una venta de $0. No se puede cerrar una mesa unida a otra
 * directamente: hay que cerrarla desde la mesa principal.
 */
export async function cerrarEspacio(
  id: string,
  usuarioId: string,
  metodoPago?: string,
  pagos?: { metodoPago: string; monto: number; clienteId?: string }[],
  clienteId?: string
) {
  const espacio = await prisma.espacio.findUnique({ where: { id } });

  if (!espacio) {
    throw new AppError("Espacio no encontrado", 404);
  }

  if (espacio.estado !== EstadoEspacio.OCUPADA) {
    throw new AppError("Este espacio no está ocupado", 400);
  }

  if (espacio.espacioPadreId) {
    const padre = await prisma.espacio.findUnique({ where: { id: espacio.espacioPadreId } });
    throw new AppError(
      `Esta mesa está unida a ${padre?.nombre ?? "otra mesa"}; ciérrala desde ahí`,
      400
    );
  }

  const grupo = await obtenerGrupoDeEspacios(espacio);
  const pedidosDeSesion = await obtenerPedidosDeGrupo(grupo);
  const total = calcularTotalDePedidos(pedidosDeSesion);

  if (total > 0 && !metodoPago && !pagos) {
    throw new AppError("Selecciona un método de pago para cerrar la cuenta", 400);
  }

  // Fiado siempre necesita saber a quién se le está fiando.
  if (metodoPago === "FIADO" && !clienteId) {
    throw new AppError("Selecciona un cliente para fiar esta cuenta", 400);
  }
  if (pagos) {
    for (const p of pagos) {
      if (p.metodoPago === "FIADO" && !p.clienteId) {
        throw new AppError("Selecciona un cliente para cada pago fiado", 400);
      }
    }
  }

  if (pagos) {
    const sumaPagos = pagos.reduce((s, p) => s + p.monto, 0);
    // Tolerancia de $1 por posibles redondeos al dividir.
    if (Math.abs(sumaPagos - total) > 1) {
      throw new AppError(
        `La suma de los pagos (${sumaPagos}) no coincide con el total (${total})`,
        400
      );
    }
  }

  const { espacioActualizado, ventas } = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const ventasCreadas = [];

    if (total > 0) {
      const cajaAbierta = await tx.caja.findFirst({ where: { abierta: true } });
      const listaPagos = pagos ?? [{ metodoPago: metodoPago!, monto: total, clienteId }];

      for (let i = 0; i < listaPagos.length; i++) {
        const pago = listaPagos[i];
        const esFiado = pago.metodoPago === "FIADO";

        const venta = await tx.venta.create({
          data: {
            espacioId: espacio.id,
            usuarioId,
            subtotal: pago.monto,
            descuento: 0,
            total: pago.monto,
            metodoPago: pago.metodoPago,
            cajaId: cajaAbierta?.id ?? null,
            clienteId: esFiado ? pago.clienteId : null,
          },
        });
        ventasCreadas.push(venta);

        if (esFiado) {
          // No entra plata a la caja: se carga a la cuenta del cliente para cobrar después.
          await tx.movimientoCuentaCliente.create({
            data: {
              clienteId: pago.clienteId!,
              tipo: "CARGO",
              monto: pago.monto,
              descripcion: `Consumo — ${espacio.nombre}`,
              ventaId: venta.id,
            },
          });
        } else if (cajaAbierta) {
          await tx.movimientoCaja.create({
            data: {
              cajaId: cajaAbierta.id,
              tipo: "VENTA",
              monto: pago.monto,
              descripcion:
                listaPagos.length > 1
                  ? `Venta — ${espacio.nombre} (pago ${i + 1}/${listaPagos.length})`
                  : `Venta — ${espacio.nombre}`,
              usuarioId,
              ventaId: venta.id,
            },
          });
        }
      }

      // Todos los pedidos (de todas las mesas del grupo) quedan vinculados a
      // la PRIMERA venta, para poder reconstruir el ticket itemizado después.
      // Las ventas adicionales de una cuenta dividida son registros de pago
      // (importan para caja y reportes), no tickets itemizados separados.
      await tx.pedido.updateMany({
        where: { id: { in: pedidosDeSesion.map((p) => p.id) } },
        data: { ventaId: ventasCreadas[0].id },
      });
    }

    // Libera TODAS las mesas del grupo (la principal y las unidas a ella).
    const idsALiberar = grupo.map((e) => e.id);
    await tx.espacio.updateMany({
      where: { id: { in: idsALiberar } },
      data: {
        estado: EstadoEspacio.LIBRE,
        horaApertura: null,
        descripcion: null,
        espacioPadreId: null,
      },
    });

    const espacioActualizado = await tx.espacio.findUniqueOrThrow({ where: { id } });

    return { espacioActualizado, ventas: ventasCreadas };
  });

  getIO().emit(SOCKET_EVENTS.ESPACIO_ACTUALIZADO, espacioActualizado);

  return { espacio: espacioActualizado, venta: ventas[0] ?? null, ventas };
}
