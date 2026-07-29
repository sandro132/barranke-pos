import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/errorHandler";
import { AppError } from "../../middlewares/errorHandler";
import * as pedidoService from "./pedido.service";
import { actualizarEstadoItemSchema, crearPedidoSchema } from "./pedido.schema";

export const crearHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("No autenticado", 401);
  const data = crearPedidoSchema.parse(req.body);
  const pedido = await pedidoService.crearPedido(req.user.userId, data);
  res.status(201).json(pedido);
});

export const listarPorEspacioHandler = asyncHandler(async (req: Request, res: Response) => {
  const pedidos = await pedidoService.listarPorEspacio(req.params.espacioId);
  res.json(pedidos);
});

export const listarCocinaHandler = asyncHandler(async (_req: Request, res: Response) => {
  const items = await pedidoService.listarParaCocina();
  res.json(items);
});

export const listarBarraHandler = asyncHandler(async (_req: Request, res: Response) => {
  const items = await pedidoService.listarParaBarra();
  res.json(items);
});

export const actualizarEstadoItemHandler = asyncHandler(async (req: Request, res: Response) => {
  const { estado } = actualizarEstadoItemSchema.parse(req.body);
  const item = await pedidoService.actualizarEstadoItem(req.params.itemId, estado);
  res.json(item);
});

export const repetirUltimaRondaHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("No autenticado", 401);
  const pedido = await pedidoService.repetirUltimaRonda(req.params.espacioId, req.user.userId);
  res.status(201).json(pedido);
});
