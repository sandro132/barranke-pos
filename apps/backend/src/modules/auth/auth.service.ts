import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { AppError } from "../../middlewares/errorHandler";
import { CambiarPasswordInput, LoginInput } from "./auth.schema";

/**
 * El service nunca conoce Express (req/res). Solo lógica de negocio.
 * Esto lo hace fácil de testear y de reutilizar (ej. desde un script o un job).
 */
export async function login({ email, password }: LoginInput) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });

  if (!usuario || !usuario.activo) {
    throw new AppError("Credenciales inválidas", 401);
  }

  const passwordValida = await bcrypt.compare(password, usuario.password);
  if (!passwordValida) {
    throw new AppError("Credenciales inválidas", 401);
  }

  const token = jwt.sign(
    { userId: usuario.id, rol: usuario.rol },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn } as jwt.SignOptions
  );

  return {
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
    },
  };
}

export async function getUsuarioActual(userId: string) {
  const usuario = await prisma.usuario.findUnique({ where: { id: userId } });

  if (!usuario) {
    throw new AppError("Usuario no encontrado", 404);
  }

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
  };
}

/**
 * Exige la contraseña actual para poder cambiarla (no basta con estar logueado) —
 * así, si alguien deja una sesión abierta sin querer, no cualquiera puede
 * secuestrar la cuenta con solo cambiarle la clave.
 */
export async function cambiarPassword(userId: string, data: CambiarPasswordInput) {
  const usuario = await prisma.usuario.findUnique({ where: { id: userId } });

  if (!usuario) {
    throw new AppError("Usuario no encontrado", 404);
  }

  const passwordValida = await bcrypt.compare(data.passwordActual, usuario.password);
  if (!passwordValida) {
    throw new AppError("La contraseña actual no es correcta", 401);
  }

  const nuevoHash = await bcrypt.hash(data.passwordNueva, 10);

  await prisma.usuario.update({
    where: { id: userId },
    data: { password: nuevoHash },
  });
}
