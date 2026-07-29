import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/errorHandler";
import * as inventarioService from "./inventario.service";
import { simularVentaSchema } from "./inventario.schema";

export const simularVentaHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = simularVentaSchema.parse(req.body);
  const resultado = await inventarioService.descontarInventarioPorVenta(
    data.productoId,
    data.cantidad
  );
  res.json(resultado);
});

export const listarMovimientosHandler = asyncHandler(async (req: Request, res: Response) => {
  const limite = req.query.limite ? Number(req.query.limite) : undefined;
  const movimientos = await inventarioService.listarMovimientos(limite);
  res.json(movimientos);
});
