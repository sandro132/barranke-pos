import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { ActualizarUsuarioInput, CrearUsuarioInput, ResetearPasswordInput } from "./usuario.schema";

const SIN_PASSWORD = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
  activo: true,
  createdAt: true,
} as const;

export async function listarUsuarios() {
  return prisma.usuario.findMany({ select: SIN_PASSWORD, orderBy: { nombre: "asc" } });
}

export async function crearUsuario(data: CrearUsuarioInput) {
  const existente = await prisma.usuario.findUnique({ where: { email: data.email } });
  if (existente) {
    throw new AppError("Ya existe un usuario con ese email", 400);
  }

  const hash = await bcrypt.hash(data.password, 10);

  return prisma.usuario.create({
    data: { nombre: data.nombre, email: data.email, password: hash, rol: data.rol },
    select: SIN_PASSWORD,
  });
}

export async function actualizarUsuario(id: string, data: ActualizarUsuarioInput) {
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) {
    throw new AppError("Usuario no encontrado", 404);
  }

  return prisma.usuario.update({ where: { id }, data, select: SIN_PASSWORD });
}

/** Solo un Admin puede resetear la contraseña de otro usuario (ej. la olvidó). */
export async function resetearPassword(id: string, data: ResetearPasswordInput) {
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) {
    throw new AppError("Usuario no encontrado", 404);
  }

  const hash = await bcrypt.hash(data.passwordNueva, 10);
  await prisma.usuario.update({ where: { id }, data: { password: hash } });
}
