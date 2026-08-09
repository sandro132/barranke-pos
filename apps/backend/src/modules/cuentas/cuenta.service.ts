import { Cuenta, Pedido, ItemPedido, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { EstadoCuenta, EstadoPedido } from "@barranke/shared";
import { getIO } from "../../sockets/socketServer";
import { SOCKET_EVENTS } from "@barranke/shared";
import { AbrirCuentaInput, ActualizarCuentaInput } from "./cuenta.schema";

type PedidoConItems = Pedido & { items: ItemPedido[] };

const INCLUDE_ESPACIO = { espacio: true } satisfies Prisma.CuentaInclude;

/**
 * Trae el "grupo" de una cuenta: ella misma más todas las cuentas unidas a
 * ella (si las tiene). Si la cuenta es en sí una unida a otra (tiene
 * cuentaPadreId), el grupo es solo ella misma — las cuentas unidas no
 * calculan su propio grupo, eso lo hace la cuenta principal.
 */
async function obtenerGrupoDeCuentas(cuenta: Cuenta): Promise<Cuenta[]> {
  if (cuenta.cuentaPadreId) {
    return [cuenta];
  }
  const hijas = await prisma.cuenta.findMany({ where: { cuentaPadreId: cuenta.id } });
  return [cuenta, ...hijas];
}

/**
 * Trae todos los pedidos (no cancelados) de un grupo de cuentas. A
 * diferencia del viejo sistema de mesas, no hace falta filtrar por rango de
 * fechas: cada pedido queda vinculado a una cuenta específica desde que se
 * crea, así que basta con su cuentaId.
 */
async function obtenerPedidosDeGrupo(grupo: { id: string }[]): Promise<PedidoConItems[]> {
  return prisma.pedido.findMany({
    where: {
      cuentaId: { in: grupo.map((c) => c.id) },
      estado: { not: EstadoPedido.CANCELADO },
    },
    include: { items: true },
  });
}

function calcularTotalDePedidos(pedidos: PedidoConItems[]): number {
  return pedidos.reduce((total: number, pedido: PedidoConItems) => {
    const totalPedido = pedido.items
      .filter((item: ItemPedido) => item.estado !== EstadoPedido.CANCELADO)
      .reduce((sub: number, item: ItemPedido) => sub + Number(item.precioUnitario) * item.cantidad, 0);
    return total + totalPedido;
  }, 0);
}

/**
 * Calcula el total consumido y el tiempo abierta de una cuenta. Si tiene
 * cuentas unidas, el total incluye el consumo de todas. Si ES una cuenta
 * unida a otra, no calcula su propio total (se maneja desde la principal)
 * — solo indica a cuál está unida.
 */
async function conDetalleDeConsumo(cuenta: Cuenta & { espacio: { id: string; nombre: string } | null }) {
  const tiempoAbiertaMinutos = Math.floor((Date.now() - cuenta.horaApertura.getTime()) / 60000);

  if (cuenta.cuentaPadreId) {
    const padre = await prisma.cuenta.findUnique({ where: { id: cuenta.cuentaPadreId } });
    return {
      ...cuenta,
      totalConsumido: 0,
      tiempoAbiertaMinutos,
      unidaA: padre?.nombre ?? null,
      cuentasUnidas: [] as string[],
    };
  }

  const grupo = await obtenerGrupoDeCuentas(cuenta);
  const pedidos = await obtenerPedidosDeGrupo(grupo);
  const totalConsumido = calcularTotalDePedidos(pedidos);
  const cuentasUnidas = grupo.filter((c) => c.id !== cuenta.id).map((c) => c.nombre);

  return { ...cuenta, totalConsumido, tiempoAbiertaMinutos, unidaA: null, cuentasUnidas };
}

/** Lista las cuentas ABIERTAS ahora mismo — la pantalla principal del día a día. */
export async function listarCuentasAbiertas() {
  const cuentas = await prisma.cuenta.findMany({
    where: { estado: EstadoCuenta.ABIERTA },
    include: INCLUDE_ESPACIO,
    orderBy: { horaApertura: "asc" },
  });

  return Promise.all(cuentas.map((c) => conDetalleDeConsumo(c)));
}

export async function obtenerCuentaPorId(id: string) {
  const cuenta = await prisma.cuenta.findUnique({ where: { id }, include: INCLUDE_ESPACIO });

  if (!cuenta) {
    throw new AppError("Cuenta no encontrada", 404);
  }

  return conDetalleDeConsumo(cuenta);
}

/** Abre una cuenta nueva a nombre de alguien, opcionalmente ubicada en una mesa/barra. */
export async function abrirCuenta(usuarioId: string, data: AbrirCuentaInput) {
  const cuenta = await prisma.cuenta.create({
    data: {
      nombre: data.nombre,
      espacioId: data.espacioId,
      descripcion: data.descripcion,
      estado: EstadoCuenta.ABIERTA,
      horaApertura: new Date(),
      usuarioId,
    },
    include: INCLUDE_ESPACIO,
  });

  getIO().emit(SOCKET_EVENTS.CUENTA_ACTUALIZADA, cuenta);

  return cuenta;
}

/** Renombrar la cuenta, o cambiarle/quitarle la mesa asociada. */
export async function actualizarCuenta(id: string, data: ActualizarCuentaInput) {
  await obtenerCuentaPorId(id);

  const actualizada = await prisma.cuenta.update({
    where: { id },
    data,
    include: INCLUDE_ESPACIO,
  });

  getIO().emit(SOCKET_EVENTS.CUENTA_ACTUALIZADA, actualizada);

  return actualizada;
}

/**
 * Une una o más cuentas ("hijas") a una cuenta "principal": desde ese
 * momento, el total y el cierre de cuenta de la principal incluyen el
 * consumo de todas. Restricciones: todas deben estar abiertas, ninguna
 * puede estar ya unida a otra, y no se permite anidar.
 */
export async function unirCuentas(padreId: string, hijoIds: string[]) {
  if (hijoIds.includes(padreId)) {
    throw new AppError("Una cuenta no se puede unir consigo misma", 400);
  }

  const padre = await prisma.cuenta.findUnique({ where: { id: padreId } });
  if (!padre) throw new AppError("Cuenta no encontrada", 404);
  if (padre.estado !== EstadoCuenta.ABIERTA) {
    throw new AppError("La cuenta principal debe estar abierta para unir otras a ella", 400);
  }
  if (padre.cuentaPadreId) {
    throw new AppError("Esta cuenta ya está unida a otra; no puede ser la principal", 400);
  }

  const hijas = await prisma.cuenta.findMany({ where: { id: { in: hijoIds } } });
  if (hijas.length !== hijoIds.length) {
    throw new AppError("Alguna de las cuentas seleccionadas no existe", 404);
  }

  for (const hija of hijas) {
    if (hija.estado !== EstadoCuenta.ABIERTA) {
      throw new AppError(`${hija.nombre} debe estar abierta para unirla`, 400);
    }
    if (hija.cuentaPadreId) {
      throw new AppError(`${hija.nombre} ya está unida a otra cuenta`, 400);
    }
  }

  const tieneHijasPropias = await prisma.cuenta.findFirst({
    where: { cuentaPadreId: { in: hijoIds } },
  });
  if (tieneHijasPropias) {
    throw new AppError("No se pueden unir cuentas que ya tienen otras cuentas unidas a ellas", 400);
  }

  await prisma.cuenta.updateMany({
    where: { id: { in: hijoIds } },
    data: { cuentaPadreId: padreId },
  });

  const actualizada = await obtenerCuentaPorId(padreId);
  getIO().emit(SOCKET_EVENTS.CUENTA_ACTUALIZADA, actualizada);

  return actualizada;
}

/** Desune una cuenta del grupo al que estaba unida. */
export async function separarCuenta(hijoId: string) {
  const hija = await prisma.cuenta.findUnique({ where: { id: hijoId } });
  if (!hija) throw new AppError("Cuenta no encontrada", 404);
  if (!hija.cuentaPadreId) throw new AppError("Esta cuenta no está unida a ninguna otra", 400);

  await prisma.cuenta.update({
    where: { id: hijoId },
    data: { cuentaPadreId: null },
  });

  const actualizada = await obtenerCuentaPorId(hijoId);
  getIO().emit(SOCKET_EVENTS.CUENTA_ACTUALIZADA, actualizada);

  return actualizada;
}

/**
 * Arma la precuenta de una cuenta: el detalle de lo consumido hasta ahora,
 * itemizado por producto, SIN cerrarla ni generar ninguna Venta. Es solo
 * para mostrarle al cliente cuánto va antes de pagar.
 */
export async function obtenerPrecuenta(cuentaId: string) {
  const cuenta = await prisma.cuenta.findUnique({ where: { id: cuentaId } });
  if (!cuenta) throw new AppError("Cuenta no encontrada", 404);

  if (cuenta.cuentaPadreId) {
    throw new AppError("Esta cuenta está unida a otra; consulta la precuenta desde ahí", 400);
  }
  if (cuenta.estado !== EstadoCuenta.ABIERTA) {
    throw new AppError("Esta cuenta no está abierta", 400);
  }

  const grupo = await obtenerGrupoDeCuentas(cuenta);
  const pedidos = await prisma.pedido.findMany({
    where: {
      cuentaId: { in: grupo.map((c) => c.id) },
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
  const cuentasUnidas = grupo.filter((c) => c.id !== cuenta.id).map((c) => c.nombre);

  return { cuenta: cuenta.nombre, cuentasUnidas, items, total };
}

/**
 * Cierra una cuenta (y, si tiene cuentas unidas, las cierra todas juntas):
 * genera una Venta real con el método de pago indicado, o varias si se
 * dividió la cuenta. Si hay una caja abierta, registra el movimiento
 * correspondiente. Si no hubo consumo, simplemente la cierra sin generar
 * una venta de $0. No se puede cerrar una cuenta unida a otra directamente.
 */
export async function cerrarCuenta(
  id: string,
  usuarioId: string,
  metodoPago?: string,
  pagos?: { metodoPago: string; monto: number; clienteId?: string }[],
  clienteId?: string
) {
  const cuenta = await prisma.cuenta.findUnique({ where: { id } });

  if (!cuenta) {
    throw new AppError("Cuenta no encontrada", 404);
  }

  if (cuenta.estado !== EstadoCuenta.ABIERTA) {
    throw new AppError("Esta cuenta no está abierta", 400);
  }

  if (cuenta.cuentaPadreId) {
    const padre = await prisma.cuenta.findUnique({ where: { id: cuenta.cuentaPadreId } });
    throw new AppError(
      `Esta cuenta está unida a ${padre?.nombre ?? "otra cuenta"}; ciérrala desde ahí`,
      400
    );
  }

  const grupo = await obtenerGrupoDeCuentas(cuenta);
  const pedidosDeSesion = await obtenerPedidosDeGrupo(grupo);
  const total = calcularTotalDePedidos(pedidosDeSesion);

  if (total > 0 && !metodoPago && !pagos) {
    throw new AppError("Selecciona un método de pago para cerrar la cuenta", 400);
  }

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
    if (Math.abs(sumaPagos - total) > 1) {
      throw new AppError(
        `La suma de los pagos (${sumaPagos}) no coincide con el total (${total})`,
        400
      );
    }
  }

  const { cuentaActualizada, ventas } = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const ventasCreadas = [];

    if (total > 0) {
      const cajaAbierta = await tx.caja.findFirst({ where: { abierta: true } });
      const listaPagos = pagos ?? [{ metodoPago: metodoPago!, monto: total, clienteId }];

      for (let i = 0; i < listaPagos.length; i++) {
        const pago = listaPagos[i];
        const esFiado = pago.metodoPago === "FIADO";

        const venta = await tx.venta.create({
          data: {
            cuentaId: cuenta.id,
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
          await tx.movimientoCuentaCliente.create({
            data: {
              clienteId: pago.clienteId!,
              tipo: "CARGO",
              monto: pago.monto,
              descripcion: `Consumo — ${cuenta.nombre}`,
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
                  ? `Venta — ${cuenta.nombre} (pago ${i + 1}/${listaPagos.length})`
                  : `Venta — ${cuenta.nombre}`,
              usuarioId,
              ventaId: venta.id,
            },
          });
        }
      }

      await tx.pedido.updateMany({
        where: { id: { in: pedidosDeSesion.map((p) => p.id) } },
        data: { ventaId: ventasCreadas[0].id },
      });
    }

    const idsACerrar = grupo.map((c) => c.id);
    await tx.cuenta.updateMany({
      where: { id: { in: idsACerrar } },
      data: { estado: EstadoCuenta.CERRADA, cuentaPadreId: null },
    });

    const cuentaActualizada = await tx.cuenta.findUniqueOrThrow({ where: { id } });

    return { cuentaActualizada, ventas: ventasCreadas };
  });

  getIO().emit(SOCKET_EVENTS.CUENTA_ACTUALIZADA, cuentaActualizada);

  return { cuenta: cuentaActualizada, venta: ventas[0] ?? null, ventas };
}
