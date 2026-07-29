import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { PREFIJO_SKU_POR_CATEGORIA, CategoriaProducto } from "@barranke/shared";
import { ActualizarProductoInput, CrearProductoInput } from "./producto.schema";

/**
 * Genera el siguiente código interno (SKU) disponible para una categoría,
 * ej: CERV-001, CERV-002, COCT-001...
 * Busca el número más alto ya usado en esa categoría y le suma 1,
 * en vez de contar filas, para no reutilizar códigos si se borra un producto.
 */
async function generarSiguienteSku(categoria: CategoriaProducto): Promise<string> {
  const prefijo = PREFIJO_SKU_POR_CATEGORIA[categoria];

  const productosDeLaCategoria = await prisma.producto.findMany({
    where: { codigoInterno: { startsWith: `${prefijo}-` } },
    select: { codigoInterno: true },
  });

  let maxNumero = 0;
  for (const p of productosDeLaCategoria) {
    const partes = p.codigoInterno.split("-");
    const numero = Number(partes[1]);
    if (!Number.isNaN(numero) && numero > maxNumero) {
      maxNumero = numero;
    }
  }

  const siguiente = maxNumero + 1;
  return `${prefijo}-${String(siguiente).padStart(3, "0")}`;
}

export async function listarProductos(filtros: {
  categoria?: CategoriaProducto;
  activo?: boolean;
  busqueda?: string;
}) {
  return prisma.producto.findMany({
    where: {
      categoria: filtros.categoria,
      activo: filtros.activo,
      nombre: filtros.busqueda
        ? { contains: filtros.busqueda }
        : undefined,
    },
    include: { receta: { include: { ingrediente: true } } },
    orderBy: { nombre: "asc" },
  });
}

export async function obtenerProductoPorId(id: string) {
  const producto = await prisma.producto.findUnique({
    where: { id },
    include: { receta: { include: { ingrediente: true } } },
  });

  if (!producto) {
    throw new AppError("Producto no encontrado", 404);
  }

  return producto;
}

export async function crearProducto(data: CrearProductoInput) {
  const codigoInterno = await generarSiguienteSku(data.categoria);

  return prisma.producto.create({
    data: {
      nombre: data.nombre,
      categoria: data.categoria,
      precio: data.precio,
      costo: data.costo,
      stock: data.stock,
      unidad: data.unidad,
      imagenUrl: data.imagenUrl ?? null,
      codigoInterno,
    },
  });
}

export async function actualizarProducto(id: string, data: ActualizarProductoInput) {
  await obtenerProductoPorId(id); // valida que exista, si no lanza 404

  return prisma.producto.update({
    where: { id },
    data,
  });
}

/**
 * "Eliminar" un producto en realidad lo desactiva (activo: false).
 * Nunca se borra de verdad: puede tener ventas históricas asociadas
 * que deben seguir apareciendo en reportes.
 */
export async function desactivarProducto(id: string) {
  await obtenerProductoPorId(id);

  return prisma.producto.update({
    where: { id },
    data: { activo: false },
  });
}

export async function reactivarProducto(id: string) {
  await obtenerProductoPorId(id);

  return prisma.producto.update({
    where: { id },
    data: { activo: true },
  });
}
