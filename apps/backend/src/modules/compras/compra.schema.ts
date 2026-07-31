import { z } from "zod";

// Cada ítem de una compra es O un producto (ej. cerveza comprada ya lista para
// vender) O un ingrediente (ej. tequila para preparar margaritas) — nunca ambos,
// nunca ninguno.
const itemCompraInputSchema = z
  .object({
    productoId: z.string().optional(),
    ingredienteId: z.string().optional(),
    cantidad: z.number().positive("La cantidad debe ser mayor a 0"),
    costoUnitario: z.number().nonnegative("El costo no puede ser negativo"),
  })
  .refine((data) => (data.productoId ? 1 : 0) + (data.ingredienteId ? 1 : 0) === 1, {
    message: "Cada ítem debe tener exactamente un producto O un ingrediente",
  });

export const crearCompraSchema = z.object({
  proveedor: z.string().min(1, "El proveedor es requerido"),
  factura: z.string().optional(),
  items: z.array(itemCompraInputSchema).min(1, "La compra debe tener al menos un ítem"),
});

export type CrearCompraInput = z.infer<typeof crearCompraSchema>;
