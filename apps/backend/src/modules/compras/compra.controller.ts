import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/errorHandler";
import * as compraService from "./compra.service";
import { actualizarCompraSchema, crearCompraSchema } from "./compra.schema";

export const listarHandler = asyncHandler(async (_req: Request, res: Response) => {
  const compras = await compraService.listarCompras();
  res.json(compras);
});

export const obtenerHandler = asyncHandler(async (req: Request, res: Response) => {
  const compra = await compraService.obtenerCompra(req.params.id);
  res.json(compra);
});

export const crearHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = crearCompraSchema.parse(req.body);
  const compra = await compraService.crearCompra(data);
  res.status(201).json(compra);
});

export const actualizarHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = actualizarCompraSchema.parse(req.body);
  const compra = await compraService.actualizarCompra(req.params.id, data);
  res.json(compra);
});

export const anularHandler = asyncHandler(async (req: Request, res: Response) => {
  await compraService.anularCompra(req.params.id);
  res.status(204).send();
});
