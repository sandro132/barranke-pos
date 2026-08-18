import { Request, Response } from "express";
import { asyncHandler, AppError } from "../../middlewares/errorHandler";
import * as usuarioService from "./usuario.service";
import { actualizarUsuarioSchema, crearUsuarioSchema, resetearPasswordSchema } from "./usuario.schema";

export const listarHandler = asyncHandler(async (_req: Request, res: Response) => {
  const usuarios = await usuarioService.listarUsuarios();
  res.json(usuarios);
});

export const crearHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = crearUsuarioSchema.parse(req.body);
  const usuario = await usuarioService.crearUsuario(data);
  res.status(201).json(usuario);
});

export const actualizarHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("No autenticado", 401);
  const data = actualizarUsuarioSchema.parse(req.body);

  // Un admin no puede quitarse su propio rol de admin ni desactivarse a sí
  // mismo por accidente — evita que el bar se quede sin ningún admin.
  if (req.params.id === req.user.userId) {
    if (data.rol && data.rol !== "ADMIN") {
      throw new AppError("No puedes quitarte tu propio rol de administrador", 400);
    }
    if (data.activo === false) {
      throw new AppError("No puedes desactivar tu propia cuenta", 400);
    }
  }

  const usuario = await usuarioService.actualizarUsuario(req.params.id, data);
  res.json(usuario);
});

export const resetearPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = resetearPasswordSchema.parse(req.body);
  await usuarioService.resetearPassword(req.params.id, data);
  res.status(204).send();
});
