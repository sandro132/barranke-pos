import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/errorHandler";
import * as compraService from "./compra.service";
import { crearCompraSchema } from "./compra.schema";

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
