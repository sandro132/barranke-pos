import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { ActualizarPromocionInput, CrearPromocionInput } from "./promocion.schema";

/**
 * Este módulo es CRUD puro: crea, lista, edita y elimina promociones para
 * que queden guardadas en el sistema. A propósito NO incluye lógica para
 * aplicarlas automáticamente a una venta (calcular descuentos por horario,
 * validar día de la semana, etc.) — eso es una fase futura más grande.
 * Por ahora, "activa" es solo informativo.
 */
export async function listarPromociones() {
  return prisma.promocion.findMany({ orderBy: { nombre: "asc" }, include: { producto: true } });
}

export async function obtenerPromocion(id: string) {
  const promocion = await prisma.promocion.findUnique({ where: { id } });
  if (!promocion) {
    throw new AppError("Promoción no encontrada", 404);
  }
  return promocion;
}

export async function crearPromocion(data: CrearPromocionInput) {
  return prisma.promocion.create({ data });
}

export async function actualizarPromocion(id: string, data: ActualizarPromocionInput) {
  await obtenerPromocion(id);
  return prisma.promocion.update({ where: { id }, data });
}

export async function eliminarPromocion(id: string) {
  await obtenerPromocion(id);
  await prisma.promocion.delete({ where: { id } });
}
