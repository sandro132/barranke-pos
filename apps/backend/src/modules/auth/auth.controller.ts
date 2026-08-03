import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/errorHandler";
import { cambiarPasswordSchema, loginSchema } from "./auth.schema";
import * as authService from "./auth.service";
import { AppError } from "../../middlewares/errorHandler";

export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = loginSchema.parse(req.body);
  const resultado = await authService.login(data);
  res.json(resultado);
});

export const meHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("No autenticado", 401);
  }
  const usuario = await authService.getUsuarioActual(req.user.userId);
  res.json(usuario);
});

export const cambiarPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("No autenticado", 401);
  }
  const data = cambiarPasswordSchema.parse(req.body);
  await authService.cambiarPassword(req.user.userId, data);
  res.status(204).send();
});
