import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/errorHandler";
import * as promocionService from "./promocion.service";
import { actualizarPromocionSchema, crearPromocionSchema } from "./promocion.schema";

export const listarHandler = asyncHandler(async (_req: Request, res: Response) => {
  const promociones = await promocionService.listarPromociones();
  res.json(promociones);
});

export const obtenerHandler = asyncHandler(async (req: Request, res: Response) => {
  const promocion = await promocionService.obtenerPromocion(req.params.id);
  res.json(promocion);
});

export const crearHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = crearPromocionSchema.parse(req.body);
  const promocion = await promocionService.crearPromocion(data);
  res.status(201).json(promocion);
});

export const actualizarHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = actualizarPromocionSchema.parse(req.body);
  const promocion = await promocionService.actualizarPromocion(req.params.id, data);
  res.json(promocion);
});

export const eliminarHandler = asyncHandler(async (req: Request, res: Response) => {
  await promocionService.eliminarPromocion(req.params.id);
  res.status(204).send();
});
