import { Request, Response } from "express";
import { asyncHandler, AppError } from "../../middlewares/errorHandler";
import * as cajaService from "./caja.service";
import { abrirCajaSchema, cerrarCajaSchema, registrarMovimientoSchema } from "./caja.schema";

export const obtenerActualHandler = asyncHandler(async (_req: Request, res: Response) => {
  const resumen = await cajaService.obtenerResumenCajaAbierta();
  res.json(resumen);
});

export const abrirHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("No autenticado", 401);
  const data = abrirCajaSchema.parse(req.body);
  const caja = await cajaService.abrirCaja(req.user.userId, data);
  res.status(201).json(caja);
});

export const registrarMovimientoHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("No autenticado", 401);
  const data = registrarMovimientoSchema.parse(req.body);
  const movimiento = await cajaService.registrarMovimiento(req.user.userId, data);
  res.status(201).json(movimiento);
});

export const cerrarHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("No autenticado", 401);
  const data = cerrarCajaSchema.parse(req.body);
  const resultado = await cajaService.cerrarCaja(req.user.userId, data);
  res.json(resultado);
});

export const historialHandler = asyncHandler(async (_req: Request, res: Response) => {
  const historial = await cajaService.listarHistorial();
  res.json(historial);
});

export const detalleHandler = asyncHandler(async (req: Request, res: Response) => {
  const detalle = await cajaService.obtenerDetalleCaja(req.params.id);
  res.json(detalle);
});
