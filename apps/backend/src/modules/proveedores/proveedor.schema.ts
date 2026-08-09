import { z } from "zod";

export const crearProveedorSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  telefono: z.string().optional(),
  contacto: z.string().optional(),
  notas: z.string().optional(),
});

export const actualizarProveedorSchema = crearProveedorSchema.partial();

export type CrearProveedorInput = z.infer<typeof crearProveedorSchema>;
export type ActualizarProveedorInput = z.infer<typeof actualizarProveedorSchema>;
