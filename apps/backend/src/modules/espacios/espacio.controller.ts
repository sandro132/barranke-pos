import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/errorHandler";
import * as espacioService from "./espacio.service";
import { actualizarEspacioSchema, crearEspacioSchema, listarEspaciosQuerySchema } from "./espacio.schema";

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
