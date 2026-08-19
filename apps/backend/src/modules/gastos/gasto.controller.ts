import { Request, Response } from "express";
import { asyncHandler, AppError } from "../../middlewares/errorHandler";
import * as gastoService from "./gasto.service";
import { actualizarGastoSchema, crearGastoSchema, listarGastosQuerySchema } from "./gasto.schema";

export const listarHandler = asyncHandler(async (req: Request, res: Response) => {
  const { desde, hasta } = listarGastosQuerySchema.parse(req.query);
  const gastos = await gastoService.listarGastos(desde, hasta);
  res.json(gastos);
});

export const crearHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("No autenticado", 401);
  const data = crearGastoSchema.parse(req.body);
  const gasto = await gastoService.crearGasto(req.user.userId, data);
  res.status(201).json(gasto);
});

export const actualizarHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = actualizarGastoSchema.parse(req.body);
  const gasto = await gastoService.actualizarGasto(req.params.id, data);
  res.json(gasto);
});

export const eliminarHandler = asyncHandler(async (req: Request, res: Response) => {
  await gastoService.eliminarGasto(req.params.id);
  res.status(204).send();
});
