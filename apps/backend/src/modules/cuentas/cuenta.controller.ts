import { Request, Response } from "express";
import { asyncHandler, AppError } from "../../middlewares/errorHandler";
import * as cuentaService from "./cuenta.service";
import {
  abrirCuentaSchema,
  actualizarCuentaSchema,
  cerrarCuentaSchema,
  unirCuentasSchema,
} from "./cuenta.schema";

export const listarHandler = asyncHandler(async (_req: Request, res: Response) => {
  const cuentas = await cuentaService.listarCuentasAbiertas();
  res.json(cuentas);
});

export const obtenerHandler = asyncHandler(async (req: Request, res: Response) => {
  const cuenta = await cuentaService.obtenerCuentaPorId(req.params.id);
  res.json(cuenta);
});

export const abrirHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("No autenticado", 401);
  const data = abrirCuentaSchema.parse(req.body);
  const cuenta = await cuentaService.abrirCuenta(req.user.userId, data);
  res.status(201).json(cuenta);
});

export const actualizarHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = actualizarCuentaSchema.parse(req.body);
  const cuenta = await cuentaService.actualizarCuenta(req.params.id, data);
  res.json(cuenta);
});

export const cerrarHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("No autenticado", 401);
  const { metodoPago, pagos, clienteId, descuento, propina, metodoPropina } = cerrarCuentaSchema.parse(
    req.body
  );
  const resultado = await cuentaService.cerrarCuenta(
    req.params.id,
    req.user.userId,
    metodoPago,
    pagos,
    clienteId,
    descuento,
    propina,
    metodoPropina
  );
  res.json(resultado);
});

export const unirHandler = asyncHandler(async (req: Request, res: Response) => {
  const { hijoIds } = unirCuentasSchema.parse(req.body);
  const resultado = await cuentaService.unirCuentas(req.params.id, hijoIds);
  res.json(resultado);
});

export const separarHandler = asyncHandler(async (req: Request, res: Response) => {
  const resultado = await cuentaService.separarCuenta(req.params.id);
  res.json(resultado);
});

export const precuentaHandler = asyncHandler(async (req: Request, res: Response) => {
  const precuenta = await cuentaService.obtenerPrecuenta(req.params.id);
  res.json(precuenta);
});
