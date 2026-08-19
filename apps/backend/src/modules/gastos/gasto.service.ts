import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { ActualizarGastoInput, CrearGastoInput } from "./gasto.schema";

export async function listarGastos(desde?: string, hasta?: string) {
  const desdeDate = desde ? new Date(`${desde}T00:00:00`) : undefined;
  const hastaDate = hasta ? new Date(`${hasta}T23:59:59.999`) : undefined;

  return prisma.gasto.findMany({
    where: { fecha: { gte: desdeDate, lte: hastaDate } },
    include: { usuario: { select: { id: true, nombre: true } } },
    orderBy: { fecha: "desc" },
  });
}

export async function crearGasto(usuarioId: string, data: CrearGastoInput) {
  return prisma.gasto.create({
    data: {
      concepto: data.concepto,
      categoria: data.categoria,
      monto: data.monto,
      fecha: data.fecha ? new Date(data.fecha) : undefined,
      notas: data.notas,
      usuarioId,
    },
    include: { usuario: { select: { id: true, nombre: true } } },
  });
}

export async function actualizarGasto(id: string, data: ActualizarGastoInput) {
  const gasto = await prisma.gasto.findUnique({ where: { id } });
  if (!gasto) {
    throw new AppError("Gasto no encontrado", 404);
  }

  return prisma.gasto.update({
    where: { id },
    data: { ...data, fecha: data.fecha ? new Date(data.fecha) : undefined },
    include: { usuario: { select: { id: true, nombre: true } } },
  });
}

export async function eliminarGasto(id: string) {
  const gasto = await prisma.gasto.findUnique({ where: { id } });
  if (!gasto) {
    throw new AppError("Gasto no encontrado", 404);
  }

  await prisma.gasto.delete({ where: { id } });
}

/** Suma de gastos en un rango — la usa el reporte de ganancias para calcular la ganancia neta real. */
export async function sumaGastosEnRango(desdeDate: Date, hastaDate: Date) {
  const gastos = await prisma.gasto.findMany({
    where: { fecha: { gte: desdeDate, lte: hastaDate } },
    select: { monto: true, categoria: true },
  });

  const total = gastos.reduce((sum, g) => sum + Number(g.monto), 0);

  const porCategoria = new Map<string, number>();
  for (const g of gastos) {
    porCategoria.set(g.categoria, (porCategoria.get(g.categoria) ?? 0) + Number(g.monto));
  }

  return {
    total,
    porCategoria: Array.from(porCategoria.entries()).map(([categoria, monto]) => ({ categoria, monto })),
  };
}
