import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middlewares/errorHandler";
import * as ventaService from "./venta.service";

const cambiarMetodoPagoSchema = z.object({
  metodoPago: z.string().min(1),
  clienteId: z.string().optional(),
});

const dividirPagoSchema = z.object({
  pagos: z
    .array(
      z.object({
        metodoPago: z.string().min(1),
        monto: z.number().positive(),
        clienteId: z.string().optional(),
      })
    )
    .min(2, "Se necesitan al menos 2 pagos"),
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

export const dividirPagoHandler = asyncHandler(async (req: Request, res: Response) => {
  const { pagos } = dividirPagoSchema.parse(req.body);
  const resultado = await ventaService.dividirPagoVenta(req.params.id, pagos);
  res.json(resultado);
});
