import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { ActualizarProveedorInput, CrearProveedorInput } from "./proveedor.schema";

export async function listarProveedores() {
  return prisma.proveedor.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { compras: true } } },
  });
}

export async function obtenerProveedor(id: string) {
  const proveedor = await prisma.proveedor.findUnique({ where: { id } });
  if (!proveedor) {
    throw new AppError("Proveedor no encontrado", 404);
  }
  return proveedor;
}

export async function crearProveedor(data: CrearProveedorInput) {
  const existente = await prisma.proveedor.findUnique({ where: { nombre: data.nombre } });
  if (existente) {
    throw new AppError("Ya existe un proveedor con ese nombre", 400);
  }
  return prisma.proveedor.create({ data });
}

export async function actualizarProveedor(id: string, data: ActualizarProveedorInput) {
  await obtenerProveedor(id);

  if (data.nombre) {
    const existente = await prisma.proveedor.findUnique({ where: { nombre: data.nombre } });
    if (existente && existente.id !== id) {
      throw new AppError("Ya existe un proveedor con ese nombre", 400);
    }
  }

  return prisma.proveedor.update({ where: { id }, data });
}

export async function eliminarProveedor(id: string) {
  await obtenerProveedor(id);

  const enUso = await prisma.compra.findFirst({ where: { proveedorId: id } });
  if (enUso) {
    throw new AppError(
      "No se puede eliminar: hay compras registradas con este proveedor.",
      400
    );
  }

  await prisma.proveedor.delete({ where: { id } });
}
