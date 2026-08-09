import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middlewares/errorHandler";
import * as ventaService from "./venta.service";

const cambiarMetodoPagoSchema = z.object({
  metodoPago: z.string().min(1),
  clienteId: z.string().optional(),
});

export const obtenerTicketHandler = asyncHandler(async (req: Request, res: Response) => {
  const ticket = await ventaService.obtenerTicket(req.params.id);
  res.json(ticket);
});

export const listarHandler = asyncHandler(async (req: Request, res: Response) => {
  const { desde, hasta } = req.query;
  const ventas = await ventaService.listarVentas(
    desde as string | undefined,
    hasta as string | undefined
  );
  res.json(ventas);
});

export const anularHandler = asyncHandler(async (req: Request, res: Response) => {
  await ventaService.anularVenta(req.params.id);
  res.status(204).send();
});

export const cambiarMetodoPagoHandler = asyncHandler(async (req: Request, res: Response) => {
  const { metodoPago, clienteId } = cambiarMetodoPagoSchema.parse(req.body);
  const resultado = await ventaService.cambiarMetodoPago(req.params.id, metodoPago, clienteId);
  res.json(resultado);
});
