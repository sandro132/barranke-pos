import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { ActualizarProductoInput, CrearProductoInput } from "./producto.schema";

const INCLUDE_PRODUCTO_COMPLETO = {
  categoria: true,
  receta: { include: { ingrediente: true } },
};

/**
 * Genera el siguiente código interno (SKU) disponible para una categoría,
 * ej: CERV-001, CERV-002, MECA-001... usando el prefijo propio de esa
 * categoría (que el usuario define al crearla, o se deriva automático).
 * Busca el número más alto ya usado en esa categoría y le suma 1,
 * en vez de contar filas, para no reutilizar códigos si se borra un producto.
 */
async function generarSiguienteSku(categoriaId: string): Promise<string> {
  const categoria = await prisma.categoria.findUnique({ where: { id: categoriaId } });
  if (!categoria) {
    throw new AppError("Categoría no encontrada", 404);
  }

  const prefijo = categoria.prefijoSku;

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
  categoriaId?: string;
  activo?: boolean;
  busqueda?: string;
}) {
  return prisma.producto.findMany({
    where: {
      categoriaId: filtros.categoriaId,
      activo: filtros.activo,
      nombre: filtros.busqueda
        ? { contains: filtros.busqueda }
        : undefined,
    },
    include: INCLUDE_PRODUCTO_COMPLETO,
    orderBy: { nombre: "asc" },
  });
}

export async function obtenerProductoPorId(id: string) {
  const producto = await prisma.producto.findUnique({
    where: { id },
    include: INCLUDE_PRODUCTO_COMPLETO,
  });

  if (!producto) {
    throw new AppError("Producto no encontrado", 404);
  }

  return producto;
}

export async function crearProducto(data: CrearProductoInput) {
  const codigoInterno = await generarSiguienteSku(data.categoriaId);

  return prisma.producto.create({
    data: {
      nombre: data.nombre,
      categoriaId: data.categoriaId,
      precio: data.precio,
      costo: data.costo,
      stock: data.stock,
      stockMinimo: data.stockMinimo,
      unidad: data.unidad,
      imagenUrl: data.imagenUrl ?? null,
      codigoInterno,
    },
    include: INCLUDE_PRODUCTO_COMPLETO,
  });
}

export async function actualizarProducto(id: string, data: ActualizarProductoInput) {
  const productoActual = await obtenerProductoPorId(id); // valida que exista, si no lanza 404

  // Si se le cambió la categoría, el código (SKU) debe regenerarse con el
  // prefijo de la categoría nueva — si no, quedaría con un prefijo que ya
  // no coincide con la categoría real del producto (ej. "BEB-002" en Cerveza).
  const cambioDeCategoria = data.categoriaId && data.categoriaId !== productoActual.categoriaId;
  const codigoInterno = cambioDeCategoria ? await generarSiguienteSku(data.categoriaId!) : undefined;

  return prisma.producto.update({
    where: { id },
    data: { ...data, codigoInterno },
    include: INCLUDE_PRODUCTO_COMPLETO,
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
    include: INCLUDE_PRODUCTO_COMPLETO,
  });
}

export async function reactivarProducto(id: string) {
  await obtenerProductoPorId(id);

  return prisma.producto.update({
    where: { id },
    data: { activo: true },
    include: INCLUDE_PRODUCTO_COMPLETO,
  });
}
