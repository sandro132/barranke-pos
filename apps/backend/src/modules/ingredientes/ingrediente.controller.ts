import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/errorHandler";
import * as ingredienteService from "./ingrediente.service";
import {
  actualizarIngredienteSchema,
  ajustarStockSchema,
  crearIngredienteSchema,
} from "./ingrediente.schema";

export const listarHandler = asyncHandler(async (req: Request, res: Response) => {
  const soloStockBajo = req.query.stockBajo === "true";
  const ingredientes = await ingredienteService.listarIngredientes(soloStockBajo);
  res.json(ingredientes);
});

export const obtenerHandler = asyncHandler(async (req: Request, res: Response) => {
  const ingrediente = await ingredienteService.obtenerIngredientePorId(req.params.id);
  res.json(ingrediente);
});

export const crearHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = crearIngredienteSchema.parse(req.body);
  const ingrediente = await ingredienteService.crearIngrediente(data);
  res.status(201).json(ingrediente);
});

export const actualizarHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = actualizarIngredienteSchema.parse(req.body);
  const ingrediente = await ingredienteService.actualizarIngrediente(req.params.id, data);
  res.json(ingrediente);
});

export const eliminarHandler = asyncHandler(async (req: Request, res: Response) => {
  await ingredienteService.eliminarIngrediente(req.params.id);
  res.status(204).send();
});

export const ajustarStockHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = ajustarStockSchema.parse(req.body);
  const ingrediente = await ingredienteService.ajustarStock(req.params.id, data);
  res.json(ingrediente);
});

export const historialHandler = asyncHandler(async (req: Request, res: Response) => {
  const historial = await ingredienteService.historialMovimientos(req.params.id);
  res.json(historial);
});
