import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/errorHandler";
import * as ventaService from "./venta.service";

export const obtenerTicketHandler = asyncHandler(async (req: Request, res: Response) => {
  const ticket = await ventaService.obtenerTicket(req.params.id);
  res.json(ticket);
});
