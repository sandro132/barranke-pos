import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { MetodoPago, TipoMovimientoCaja } from "@barranke/shared";
import { AbrirCajaInput, CerrarCajaInput, RegistrarMovimientoInput } from "./caja.schema";

export async function obtenerCajaAbierta() {
  return prisma.caja.findFirst({ where: { abierta: true } });
}

export async function abrirCaja(usuarioId: string, data: AbrirCajaInput) {
  const existente = await obtenerCajaAbierta();
  if (existente) {
    throw new AppError("Ya hay una caja abierta. Ciérrala antes de abrir una nueva.", 400);
  }

  return prisma.$transaction(async (tx) => {
    const caja = await tx.caja.create({
      data: { montoInicial: data.montoInicial, abierta: true },
    });

    await tx.movimientoCaja.create({
      data: {
        cajaId: caja.id,
        tipo: TipoMovimientoCaja.APERTURA,
        monto: data.montoInicial,
        metodoPago: MetodoPago.EFECTIVO,
        descripcion: "Apertura de caja",
        usuarioId,
      },
    });

    return caja;
  });
}

export async function registrarMovimiento(usuarioId: string, data: RegistrarMovimientoInput) {
  const caja = await obtenerCajaAbierta();
  if (!caja) {
    throw new AppError("No hay una caja abierta", 400);
  }

  return prisma.movimientoCaja.create({
    data: {
      cajaId: caja.id,
      tipo: data.tipo,
      monto: data.monto,
      metodoPago: data.metodoPago,
      descripcion: data.descripcion,
      usuarioId,
    },
    include: { usuario: { select: { id: true, nombre: true } } },
  });
}

/**
 * Corrige un ingreso/gasto manual que se registró mal (monto, método o
 * descripción equivocada). Solo se pueden editar movimientos tipo INGRESO
 * o GASTO — nunca APERTURA/CIERRE/VENTA, que están atados a otros flujos
 * (una venta se corrige anulándola o cambiando su método, no editando el
 * movimiento de caja directamente). Y solo mientras la caja siga abierta:
 * una vez cerrada, ya se hizo el arqueo con esos números — cambiarlos
 * después dejaría el historial descuadrado con lo que de verdad se contó.
 */
export async function actualizarMovimiento(id: string, data: Partial<RegistrarMovimientoInput>) {
  const movimiento = await prisma.movimientoCaja.findUnique({ where: { id }, include: { caja: true } });
  if (!movimiento) {
    throw new AppError("Movimiento no encontrado", 404);
  }
  if (
    movimiento.tipo !== TipoMovimientoCaja.INGRESO &&
    movimiento.tipo !== TipoMovimientoCaja.GASTO &&
    movimiento.tipo !== TipoMovimientoCaja.PROPINA
  ) {
    throw new AppError("Solo se pueden editar ingresos, gastos o propinas registradas a mano", 400);
  }
  if (!movimiento.caja.abierta) {
    throw new AppError("Esta caja ya está cerrada; no se puede editar", 400);
  }

  return prisma.movimientoCaja.update({
    where: { id },
    data,
    include: { usuario: { select: { id: true, nombre: true } } },
  });
}

export async function eliminarMovimiento(id: string) {
  const movimiento = await prisma.movimientoCaja.findUnique({ where: { id }, include: { caja: true } });
  if (!movimiento) {
    throw new AppError("Movimiento no encontrado", 404);
  }
  if (
    movimiento.tipo !== TipoMovimientoCaja.INGRESO &&
    movimiento.tipo !== TipoMovimientoCaja.GASTO &&
    movimiento.tipo !== TipoMovimientoCaja.PROPINA
  ) {
    throw new AppError("Solo se pueden eliminar ingresos, gastos o propinas registradas a mano", 400);
  }
  if (!movimiento.caja.abierta) {
    throw new AppError("Esta caja ya está cerrada; no se puede eliminar", 400);
  }

  await prisma.movimientoCaja.delete({ where: { id } });
}

/**
 * Arma el resumen financiero de una caja: ingresos/gastos manuales, ventas
 * desglosadas por método de pago, y el monto de efectivo que DEBERÍA haber
 * en la caja física en este momento (arqueo). Solo las ventas en EFECTIVO
 * cuentan para ese cálculo — una venta por Nequi o transferencia no mueve
 * el efectivo físico de la caja.
 */
async function construirResumen(cajaId: string, montoInicial: unknown, fechaApertura: Date) {
  const [movimientos, ventas] = await Promise.all([
    prisma.movimientoCaja.findMany({
      where: { cajaId },
      include: { usuario: { select: { id: true, nombre: true } } },
      orderBy: { fecha: "asc" },
    }),
    prisma.venta.findMany({
      where: { cajaId },
      include: { cuenta: { select: { id: true, nombre: true, espacio: { select: { nombre: true } } } } },
      orderBy: { fecha: "asc" },
    }),
  ]);

  const ingresosPorMetodo: Record<string, number> = {};
  for (const m of movimientos.filter((m) => m.tipo === TipoMovimientoCaja.INGRESO)) {
    const metodo = m.metodoPago ?? "SIN_METODO";
    ingresosPorMetodo[metodo] = (ingresosPorMetodo[metodo] ?? 0) + Number(m.monto);
  }
  const ingresos = Object.values(ingresosPorMetodo).reduce((sum, v) => sum + v, 0);
  // Solo lo que de verdad fue en EFECTIVO afecta lo que debe haber en la
  // caja física — un ingreso por Nequi no mete plata física a la caja.
  const ingresosEfectivo = ingresosPorMetodo[MetodoPago.EFECTIVO] ?? 0;

  const gastosPorMetodo: Record<string, number> = {};
  for (const m of movimientos.filter((m) => m.tipo === TipoMovimientoCaja.GASTO)) {
    const metodo = m.metodoPago ?? "SIN_METODO";
    gastosPorMetodo[metodo] = (gastosPorMetodo[metodo] ?? 0) + Number(m.monto);
  }
  const gastos = Object.values(gastosPorMetodo).reduce((sum, v) => sum + v, 0);
  const gastosEfectivo = gastosPorMetodo[MetodoPago.EFECTIVO] ?? 0;

  const propinasPorMetodo: Record<string, number> = {};
  for (const m of movimientos.filter((m) => m.tipo === TipoMovimientoCaja.PROPINA)) {
    const metodo = m.metodoPago ?? "SIN_METODO";
    propinasPorMetodo[metodo] = (propinasPorMetodo[metodo] ?? 0) + Number(m.monto);
  }
  const propinas = Object.values(propinasPorMetodo).reduce((sum, v) => sum + v, 0);
  // Si la propina fue en efectivo, sí hay que esperarla en la caja física
  // (aunque no es ingreso del negocio) — por eso entra al cálculo, pero
  // nunca a "ingresos" ni a los reportes de ventas/ganancias.
  const propinasEfectivo = propinasPorMetodo[MetodoPago.EFECTIVO] ?? 0;

  const ventasPorMetodo: Record<string, number> = {};
  for (const venta of ventas) {
    ventasPorMetodo[venta.metodoPago] = (ventasPorMetodo[venta.metodoPago] ?? 0) + Number(venta.total);
  }

  const ventasEfectivo = ventasPorMetodo[MetodoPago.EFECTIVO] ?? 0;
  const totalVentas = ventas.reduce((sum, v) => sum + Number(v.total), 0);
  const montoEsperadoEfectivo =
    Number(montoInicial) + ingresosEfectivo + ventasEfectivo + propinasEfectivo - gastosEfectivo;

  return {
    cajaId,
    montoInicial: Number(montoInicial),
    fechaApertura,
    ingresos,
    ingresosPorMetodo,
    gastos,
    gastosPorMetodo,
    propinas,
    propinasPorMetodo,
    totalVentas,
    ventasPorMetodo,
    ventasEfectivo,
    montoEsperadoEfectivo,
    movimientos,
    ventas,
  };
}

export async function obtenerResumenCajaAbierta() {
  const caja = await obtenerCajaAbierta();
  if (!caja) return null;
  const resumen = await construirResumen(caja.id, caja.montoInicial, caja.fechaApertura);
  return { ...resumen, abierta: true };
}

/**
 * Cierra la caja del día. Compara el efectivo contado a mano por el usuario
 * contra el efectivo esperado según el sistema, y guarda la diferencia
 * (positiva = sobrante, negativa = faltante) para que quede en el historial.
 */
export async function cerrarCaja(usuarioId: string, data: CerrarCajaInput) {
  const caja = await obtenerCajaAbierta();
  if (!caja) {
    throw new AppError("No hay una caja abierta", 400);
  }

  const resumen = await construirResumen(caja.id, caja.montoInicial, caja.fechaApertura);
  const diferencia = data.montoContado - resumen.montoEsperadoEfectivo;

  const cerrada = await prisma.$transaction(async (tx) => {
    const actualizada = await tx.caja.update({
      where: { id: caja.id },
      data: { abierta: false, fechaCierre: new Date(), montoFinal: data.montoContado },
    });

    await tx.movimientoCaja.create({
      data: {
        cajaId: caja.id,
        tipo: TipoMovimientoCaja.CIERRE,
        monto: data.montoContado,
        descripcion:
          diferencia === 0
            ? "Cierre de caja. Cuadró exacto."
            : `Cierre de caja. ${diferencia > 0 ? "Sobrante" : "Faltante"} de ${Math.abs(diferencia)}`,
        usuarioId,
      },
    });

    return actualizada;
  });

  return { caja: cerrada, ...resumen, montoContado: data.montoContado, diferencia };
}

export async function listarHistorial() {
  return prisma.caja.findMany({ orderBy: { fechaApertura: "desc" }, take: 60 });
}

export async function obtenerDetalleCaja(id: string) {
  const caja = await prisma.caja.findUnique({ where: { id } });
  if (!caja) {
    throw new AppError("Caja no encontrada", 404);
  }
  const resumen = await construirResumen(caja.id, caja.montoInicial, caja.fechaApertura);
  return { ...resumen, abierta: caja.abierta, fechaCierre: caja.fechaCierre, montoFinal: caja.montoFinal };
}
