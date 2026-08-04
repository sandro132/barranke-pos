import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { ActualizarCategoriaInput, CrearCategoriaInput } from "./categoria.schema";

/**
 * Deriva un prefijo de 2-4 letras a partir del nombre de la categoría
 * (ej. "Mecato" -> "MECA"), para cuando el usuario no especifica uno a mano.
 * Quita tildes/espacios/números, se queda solo con letras.
 */
function derivarPrefijo(nombre: string): string {
  const limpio = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes
    .replace(/[^a-zA-Z]/g, "") // solo letras
    .toUpperCase();
  return (limpio.slice(0, 4) || "CAT").padEnd(2, "X");
}

/** Si el prefijo ya existe, le agrega un número al final hasta que sea único. */
async function resolverPrefijoUnico(base: string): Promise<string> {
  let candidato = base;
  let intento = 2;
  while (await prisma.categoria.findUnique({ where: { prefijoSku: candidato } })) {
    candidato = `${base}${intento}`;
    intento++;
  }
  return candidato;
}

export async function listarCategorias() {
  return prisma.categoria.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { productos: true } } },
  });
}

export async function obtenerCategoria(id: string) {
  const categoria = await prisma.categoria.findUnique({ where: { id } });
  if (!categoria) {
    throw new AppError("Categoría no encontrada", 404);
  }
  return categoria;
}

export async function crearCategoria(data: CrearCategoriaInput) {
  const existente = await prisma.categoria.findUnique({ where: { nombre: data.nombre } });
  if (existente) {
    throw new AppError("Ya existe una categoría con ese nombre", 400);
  }

  const prefijoBase = data.prefijoSku?.toUpperCase() ?? derivarPrefijo(data.nombre);
  const prefijoSku = await resolverPrefijoUnico(prefijoBase);

  return prisma.categoria.create({
    data: { nombre: data.nombre, prefijoSku, areaPreparacion: data.areaPreparacion },
  });
}

export async function actualizarCategoria(id: string, data: ActualizarCategoriaInput) {
  await obtenerCategoria(id);

  if (data.nombre) {
    const existente = await prisma.categoria.findUnique({ where: { nombre: data.nombre } });
    if (existente && existente.id !== id) {
      throw new AppError("Ya existe una categoría con ese nombre", 400);
    }
  }

  return prisma.categoria.update({
    where: { id },
    data: {
      nombre: data.nombre,
      prefijoSku: data.prefijoSku?.toUpperCase(),
      areaPreparacion: data.areaPreparacion,
    },
  });
}

export async function eliminarCategoria(id: string) {
  await obtenerCategoria(id);

  const enUso = await prisma.producto.findFirst({ where: { categoriaId: id } });
  if (enUso) {
    throw new AppError(
      "No se puede eliminar: hay productos usando esta categoría. Cámbialos de categoría primero.",
      400
    );
  }

  await prisma.categoria.delete({ where: { id } });
}
