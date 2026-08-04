import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/errorHandler";
import * as ventaService from "./venta.service";

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
