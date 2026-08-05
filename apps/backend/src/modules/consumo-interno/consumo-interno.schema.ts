import { z } from "zod";

export const registrarConsumoInternoSchema = z
  .object({
    productoId: z.string().optional(),
    ingredienteId: z.string().optional(),
    cantidad: z.number().positive("La cantidad debe ser mayor a 0"),
    motivo: z.string().optional(),
  })
  .refine((data) => (data.productoId ? 1 : 0) + (data.ingredienteId ? 1 : 0) === 1, {
    message: "Debe ser exactamente un producto O un ingrediente",
  });

export const listarConsumoInternoQuerySchema = z.object({
  desde: z.string().optional(),
  hasta: z.string().optional(),
});

export type RegistrarConsumoInternoInput = z.infer<typeof registrarConsumoInternoSchema>;
