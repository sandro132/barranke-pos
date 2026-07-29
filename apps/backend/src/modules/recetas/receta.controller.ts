import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/errorHandler";
import * as recetaService from "./receta.service";
import { actualizarItemRecetaSchema, agregarItemRecetaSchema } from "./receta.schema";

export const obtenerHandler = asyncHandler(async (req: Request, res: Response) => {
  const receta = await recetaService.obtenerRecetaDeProducto(req.params.productoId);
  res.json(receta);
});

export const agregarItemHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = agregarItemRecetaSchema.parse(req.body);
  const item = await recetaService.agregarItemReceta(req.params.productoId, data);
  res.status(201).json(item);
});

export const actualizarItemHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = actualizarItemRecetaSchema.parse(req.body);
  const item = await recetaService.actualizarItemReceta(
    req.params.productoId,
    req.params.ingredienteId,
    data
  );
  res.json(item);
});

export const eliminarItemHandler = asyncHandler(async (req: Request, res: Response) => {
  await recetaService.eliminarItemReceta(req.params.productoId, req.params.ingredienteId);
  res.status(204).send();
});
