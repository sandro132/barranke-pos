import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { TipoEspacio } from "@barranke/shared";
import { ActualizarEspacioInput, CrearEspacioInput } from "./espacio.schema";

/**
 * Espacio ahora es solo el catálogo físico del local (Mesa 1, Barra 2...):
 * nombre, tipo, capacidad. Nada de estado ni ocupación — eso lo maneja el
 * módulo de Cuentas. Sirve como referencia para que el mesero sepa dónde
 * entregar un pedido, no como "el dueño" de la cuenta.
 */
export async function listarEspacios(tipo?: TipoEspacio) {
  return prisma.espacio.findMany({
    where: { tipo },
    orderBy: { nombre: "asc" },
  });
}

export async function obtenerEspacioPorId(id: string) {
  const espacio = await prisma.espacio.findUnique({ where: { id } });

  if (!espacio) {
    throw new AppError("Espacio no encontrado", 404);
  }

  return espacio;
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

export async function eliminarEspacio(id: string) {
  await obtenerEspacioPorId(id);

  // Solo bloquea si hay una cuenta ABIERTA ahora mismo usando esta mesa —
  // borrarla en ese caso dejaría a alguien "sin mesa" a mitad de servicio.
  // Las cuentas del historial (ya cerradas) no bloquean el borrado: solo
  // pierden la referencia a esta mesa (queda en null), sin perder nada de
  // su información real (nombre, total, fecha, etc.).
  const abiertaEnUso = await prisma.cuenta.findFirst({ where: { espacioId: id, estado: "ABIERTA" } });
  if (abiertaEnUso) {
    throw new AppError(
      `No se puede eliminar: "${abiertaEnUso.nombre}" está abierta ahora mismo en esta mesa/barra.`,
      400
    );
  }

  await prisma.espacio.delete({ where: { id } });
}
