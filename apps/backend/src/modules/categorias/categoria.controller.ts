import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/errorHandler";
import * as categoriaService from "./categoria.service";
import { actualizarCategoriaSchema, crearCategoriaSchema } from "./categoria.schema";

export const listarHandler = asyncHandler(async (_req: Request, res: Response) => {
  const categorias = await categoriaService.listarCategorias();
  res.json(categorias);
});

export const crearHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = crearCategoriaSchema.parse(req.body);
  const categoria = await categoriaService.crearCategoria(data);
  res.status(201).json(categoria);
});

export const actualizarHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = actualizarCategoriaSchema.parse(req.body);
  const categoria = await categoriaService.actualizarCategoria(req.params.id, data);
  res.json(categoria);
});

export const eliminarHandler = asyncHandler(async (req: Request, res: Response) => {
  await categoriaService.eliminarCategoria(req.params.id);
  res.status(204).send();
});
