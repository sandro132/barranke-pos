import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { EstadoCuenta, EstadoPedido } from "@barranke/shared";
import { revertirDescuentoVenta } from "../inventario/inventario.service";

interface LineaTicket {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

/**
 * Reconstruye el ticket de una venta a partir de los pedidos que quedaron
 * vinculados a ella al momento del cierre (ver cuenta.service.ts). Agrupa
 * los ítems por producto: si la mesa pidió Poker en dos rondas distintas,
 * el ticket muestra una sola línea "2x Poker", no dos líneas separadas.
 */
export async function obtenerTicket(ventaId: string) {
  const venta = await prisma.venta.findUnique({
    where: { id: ventaId },
    include: {
      cuenta: { select: { nombre: true, espacio: { select: { nombre: true } } } },
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
    cuenta: venta.cuenta.nombre,
    espacio: venta.cuenta.espacio?.nombre ?? null,
    usuario: venta.usuario.nombre,
    metodoPago: venta.metodoPago,
    subtotal: Number(venta.subtotal),
    descuento: Number(venta.descuento),
    total: Number(venta.total),
    items: Array.from(itemsPorProducto.values()),
  };
}

/**
 * Corrige el método de pago de una venta ya hecha, sin tocar nada más (ni
 * los ítems, ni el ticket, ni el inventario) — para cuando alguien marca
 * "Efectivo" en vez de "Nequi" por error, sin tener que anular toda la
 * venta y perder el pedido.
 *
 * Entre métodos normales (Efectivo, Nequi, Transferencia, etc.) es tan
 * simple como cambiar el campo: el "efectivo esperado" de caja se calcula
 * en vivo desde el método de cada venta, así que se ajusta solo.
 *
 * Cambiar DESDE o HACIA fiado sí necesita más cuidado: fiado no mueve caja
 * (mueve la cuenta del cliente), así que hay que crear o borrar esos
 * movimientos según corresponda.
 */
export async function cambiarMetodoPago(ventaId: string, nuevoMetodo: string, clienteId?: string) {
  const venta = await prisma.venta.findUnique({
    where: { id: ventaId },
    include: { movimientoCaja: true, movimientoCuenta: true },
  });

  if (!venta) {
    throw new AppError("Venta no encontrada", 404);
  }

  if (nuevoMetodo === "FIADO" && !clienteId) {
    throw new AppError("Selecciona un cliente para fiar esta venta", 400);
  }

  const eraFiado = venta.metodoPago === "FIADO";
  const seraFiado = nuevoMetodo === "FIADO";

  await prisma.$transaction(async (tx) => {
    // Si dejó de ser fiado, borra el cargo que tenía el cliente.
    if (eraFiado && !seraFiado && venta.movimientoCuenta) {
      await tx.movimientoCuentaCliente.delete({ where: { id: venta.movimientoCuenta.id } });
    }

    // Si dejó de ser un método que mueve caja, borra ese movimiento.
    if (!eraFiado && seraFiado && venta.movimientoCaja) {
      await tx.movimientoCaja.delete({ where: { id: venta.movimientoCaja.id } });
    }

    // Si ahora SÍ es fiado (y antes no lo era), crea el cargo al cliente.
    if (seraFiado && !eraFiado) {
      await tx.movimientoCuentaCliente.create({
        data: {
          clienteId: clienteId!,
          tipo: "CARGO",
          monto: venta.total,
          descripcion: `Consumo — ${venta.id.slice(0, 8)} (método corregido a fiado)`,
          ventaId: venta.id,
        },
      });
    }

    // Si ahora NO es fiado (y antes sí lo era) y hay caja abierta, crea el
    // movimiento de caja que le faltaba.
    if (!seraFiado && eraFiado) {
      const cajaAbierta = await tx.caja.findFirst({ where: { abierta: true } });
      if (cajaAbierta) {
        await tx.movimientoCaja.create({
          data: {
            cajaId: cajaAbierta.id,
            tipo: "VENTA",
            monto: venta.total,
            metodoPago: nuevoMetodo,
            descripcion: `Venta (método corregido, ya no es fiado)`,
            usuarioId: venta.usuarioId,
            ventaId: venta.id,
          },
        });
      }
    }

    await tx.venta.update({
      where: { id: ventaId },
      data: { metodoPago: nuevoMetodo, clienteId: seraFiado ? clienteId : null },
    });
  });

  return obtenerTicket(ventaId);
}

/**
 * Divide el pago de una venta ya cerrada en varios pagos — para cuando el
 * mesero cobró todo con un solo método por error, pero en realidad el
 * cliente pagó parte en efectivo y parte por Nequi (o similar).
 *
 * La venta original se convierte en el "pago 1" (se queda con el ticket
 * itemizado y el vínculo a los pedidos). Los pagos 2..N se crean como
 * ventas nuevas, iguales a como funciona dividir cuenta al cerrar.
 */
export async function dividirPagoVenta(
  ventaId: string,
  pagos: { metodoPago: string; monto: number; clienteId?: string }[]
) {
  const venta = await prisma.venta.findUnique({
    where: { id: ventaId },
    include: { movimientoCaja: true, movimientoCuenta: true },
  });

  if (!venta) {
    throw new AppError("Venta no encontrada", 404);
  }

  if (pagos.length < 2) {
    throw new AppError("Para dividir se necesitan al menos 2 pagos", 400);
  }

  for (const p of pagos) {
    if (p.metodoPago === "FIADO" && !p.clienteId) {
      throw new AppError("Selecciona un cliente para cada pago fiado", 400);
    }
  }

  const sumaPagos = pagos.reduce((s, p) => s + p.monto, 0);
  if (Math.abs(sumaPagos - Number(venta.total)) > 1) {
    throw new AppError(
      `La suma de los pagos (${sumaPagos}) no coincide con el total (${venta.total})`,
      400
    );
  }

  await prisma.$transaction(async (tx) => {
    // Revierte lo que tenía la venta original antes de dividirla.
    if (venta.movimientoCuenta) {
      await tx.movimientoCuentaCliente.delete({ where: { id: venta.movimientoCuenta.id } });
    }
    if (venta.movimientoCaja) {
      await tx.movimientoCaja.delete({ where: { id: venta.movimientoCaja.id } });
    }

    const cajaAbierta = await tx.caja.findFirst({ where: { abierta: true } });

    for (let i = 0; i < pagos.length; i++) {
      const pago = pagos[i];
      const esFiado = pago.metodoPago === "FIADO";

      // El primer pago reutiliza la venta original (se queda con el ticket
      // itemizado y los pedidos vinculados). Los demás son ventas nuevas.
      const ventaDelPago =
        i === 0
          ? await tx.venta.update({
              where: { id: ventaId },
              data: {
                metodoPago: pago.metodoPago,
                subtotal: pago.monto,
                total: pago.monto,
                clienteId: esFiado ? pago.clienteId : null,
              },
            })
          : await tx.venta.create({
              data: {
                cuentaId: venta.cuentaId,
                usuarioId: venta.usuarioId,
                subtotal: pago.monto,
                descuento: 0,
                total: pago.monto,
                metodoPago: pago.metodoPago,
                cajaId: cajaAbierta?.id ?? null,
                clienteId: esFiado ? pago.clienteId : null,
              },
            });

      if (esFiado) {
        await tx.movimientoCuentaCliente.create({
          data: {
            clienteId: pago.clienteId!,
            tipo: "CARGO",
            monto: pago.monto,
            descripcion: `Consumo — cuenta dividida (pago ${i + 1}/${pagos.length})`,
            ventaId: ventaDelPago.id,
          },
        });
      } else if (cajaAbierta) {
        await tx.movimientoCaja.create({
          data: {
            cajaId: cajaAbierta.id,
            tipo: "VENTA",
            monto: pago.monto,
            metodoPago: pago.metodoPago,
            descripcion: `Venta (cuenta dividida, pago ${i + 1}/${pagos.length})`,
            usuarioId: venta.usuarioId,
            ventaId: ventaDelPago.id,
          },
        });
      }
    }
  });

  return obtenerTicket(ventaId);
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
      cuenta: { select: { id: true, nombre: true, espacio: { select: { nombre: true } } } },
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
    include: {
      movimientoCaja: true,
      movimientoCuenta: true,
      pedidos: { include: { items: true } },
    },
  });

  if (!venta) {
    throw new AppError("Venta no encontrada", 404);
  }

  await prisma.$transaction(async (tx) => {
    // Le devuelve al inventario lo que estos pedidos habían descontado —
    // antes esto nunca pasaba: anular una venta borraba el cobro, pero el
    // stock se quedaba como si el producto siguiera vendido.
    for (const pedido of venta.pedidos) {
      for (const item of pedido.items) {
        if (item.estado === EstadoPedido.CANCELADO) continue; // ya se había devuelto antes
        await revertirDescuentoVenta(
          tx,
          item.productoId,
          item.cantidad,
          `Anulación de venta — ${item.productoId}`
        );
      }
    }

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

    // Reabre todas las cuentas involucradas (si venían unidas, pueden ser
    // varias) — los pedidos siguen ahí, con su inventario ya devuelto,
    // listos para corregir y volver a cerrar bien.
    const cuentaIds = [...new Set(venta.pedidos.map((p) => p.cuentaId))];
    await tx.cuenta.updateMany({
      where: { id: { in: cuentaIds } },
      data: { estado: EstadoCuenta.ABIERTA },
    });

    await tx.venta.delete({ where: { id: ventaId } });
  });
}
