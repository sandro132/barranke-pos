import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/errorHandler";
import * as productoService from "./producto.service";
import {
  actualizarProductoSchema,
  crearProductoSchema,
  listarProductosQuerySchema,
} from "./producto.schema";

export const listarHandler = asyncHandler(async (req: Request, res: Response) => {
  const filtros = listarProductosQuerySchema.parse(req.query);
  const productos = await productoService.listarProductos(filtros);
  res.json(productos);
});

export const obtenerHandler = asyncHandler(async (req: Request, res: Response) => {
  const producto = await productoService.obtenerProductoPorId(req.params.id);
  res.json(producto);
});

export const crearHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = crearProductoSchema.parse(req.body);
  const producto = await productoService.crearProducto(data);
  res.status(201).json(producto);
});

export const actualizarHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = actualizarProductoSchema.parse(req.body);
  const producto = await productoService.actualizarProducto(req.params.id, data);
  res.json(producto);
});

export const desactivarHandler = asyncHandler(async (req: Request, res: Response) => {
  const producto = await productoService.desactivarProducto(req.params.id);
  res.json(producto);
});

export const reactivarHandler = asyncHandler(async (req: Request, res: Response) => {
  const producto = await productoService.reactivarProducto(req.params.id);
  res.json(producto);
});
