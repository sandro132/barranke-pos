import { z } from "zod";
import { RolUsuario } from "@barranke/shared";

export const crearUsuarioSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  rol: z.nativeEnum(RolUsuario),
});

export const actualizarUsuarioSchema = z.object({
  nombre: z.string().min(1).optional(),
  rol: z.nativeEnum(RolUsuario).optional(),
  activo: z.boolean().optional(),
});

export const resetearPasswordSchema = z.object({
  passwordNueva: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>;
export type ResetearPasswordInput = z.infer<typeof resetearPasswordSchema>;
