import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export const cambiarPasswordSchema = z.object({
  passwordActual: z.string().min(1, "Escribe tu contraseña actual"),
  passwordNueva: z.string().min(8, "La contraseña nueva debe tener al menos 8 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CambiarPasswordInput = z.infer<typeof cambiarPasswordSchema>;
