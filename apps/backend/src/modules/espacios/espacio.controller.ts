import { Request, Response } from "express";
import { asyncHandler, AppError } from "../../middlewares/errorHandler";
import * as espacioService from "./espacio.service";
import {
  abrirEspacioSchema,
  actualizarEspacioSchema,
  cerrarEspacioSchema,
  crearEspacioSchema,
  listarEspaciosQuerySchema,
} from "./espacio.schema";

export const listarHandler = asyncHandler(async (req: Request, res: Response) => {
  const { tipo } = listarEspaciosQuerySchema.parse(req.query);
  const espacios = await espacioService.listarEspacios(tipo);
  res.json(espacios);
});

export const obtenerHandler = asyncHandler(async (req: Request, res: Response) => {
  const espacio = await espacioService.obtenerEspacioPorId(req.params.id);
  res.json(espacio);
});

export const crearHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = crearEspacioSchema.parse(req.body);
  const espacio = await espacioService.crearEspacio(data);
  res.status(201).json(espacio);
});

export const actualizarHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = actualizarEspacioSchema.parse(req.body);
  const espacio = await espacioService.actualizarEspacio(req.params.id, data);
  res.json(espacio);
});

export const abrirHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = abrirEspacioSchema.parse(req.body);
  const espacio = await espacioService.abrirEspacio(req.params.id, data);
  res.json(espacio);
});

export const cerrarHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("No autenticado", 401);
  const { metodoPago } = cerrarEspacioSchema.parse(req.body);
  const resultado = await espacioService.cerrarEspacio(req.params.id, req.user.userId, metodoPago);
  res.json(resultado);
});
