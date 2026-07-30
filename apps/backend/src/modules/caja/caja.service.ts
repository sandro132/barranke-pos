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
      descripcion: data.descripcion,
      usuarioId,
    },
    include: { usuario: { select: { id: true, nombre: true } } },
  });
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
      include: { espacio: { select: { id: true, nombre: true } } },
      orderBy: { fecha: "asc" },
    }),
  ]);

  const ingresos = movimientos
    .filter((m) => m.tipo === TipoMovimientoCaja.INGRESO)
    .reduce((sum, m) => sum + Number(m.monto), 0);

  const gastos = movimientos
    .filter((m) => m.tipo === TipoMovimientoCaja.GASTO)
    .reduce((sum, m) => sum + Number(m.monto), 0);

  const ventasPorMetodo: Record<string, number> = {};
  for (const venta of ventas) {
    ventasPorMetodo[venta.metodoPago] = (ventasPorMetodo[venta.metodoPago] ?? 0) + Number(venta.total);
  }

  const ventasEfectivo = ventasPorMetodo[MetodoPago.EFECTIVO] ?? 0;
  const totalVentas = ventas.reduce((sum, v) => sum + Number(v.total), 0);
  const montoEsperadoEfectivo = Number(montoInicial) + ingresos + ventasEfectivo - gastos;

  return {
    cajaId,
    montoInicial: Number(montoInicial),
    fechaApertura,
    ingresos,
    gastos,
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
