import { Request, Response } from "express";
import { asyncHandler, AppError } from "../../middlewares/errorHandler";
import * as consumoInternoService from "./consumo-interno.service";
import { listarConsumoInternoQuerySchema, registrarConsumoInternoSchema } from "./consumo-interno.schema";

export const registrarHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("No autenticado", 401);
  const data = registrarConsumoInternoSchema.parse(req.body);
  const movimiento = await consumoInternoService.registrarConsumoInterno(req.user.userId, data);
  res.status(201).json(movimiento);
});

export const listarHandler = asyncHandler(async (req: Request, res: Response) => {
  const { desde, hasta } = listarConsumoInternoQuerySchema.parse(req.query);
  const movimientos = await consumoInternoService.listarConsumoInterno(desde, hasta);
  res.json(movimientos);
});
