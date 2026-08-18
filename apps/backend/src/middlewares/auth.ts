import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "./errorHandler";

export interface JwtPayload {
  userId: string;
  rol: string;
}

// Extiende el tipo Request de Express para incluir el usuario autenticado
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError("No autenticado", 401);
  }

  const token = header.replace("Bearer ", "");

  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    throw new AppError("Token inválido o expirado", 401);
  }
}

/**
 * Limita una ruta a ciertos roles (ej. requireRole("ADMIN")). Debe usarse
 * SIEMPRE después de requireAuth, nunca solo — necesita que req.user ya
 * esté cargado. ADMIN puede pasar cualquier chequeo de rol automáticamente,
 * para no tener que repetirlo en cada ruta.
 */
export function requireRole(...rolesPermitidos: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError("No autenticado", 401);
    }
    if (req.user.rol === "ADMIN" || rolesPermitidos.includes(req.user.rol)) {
      return next();
    }
    throw new AppError("No tienes permiso para hacer esto", 403);
  };
}
