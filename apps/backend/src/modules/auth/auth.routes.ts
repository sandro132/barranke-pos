import { Router } from "express";
import rateLimit from "express-rate-limit";
import { loginHandler, meHandler, cambiarPasswordHandler } from "./auth.controller";
import { requireAuth } from "../../middlewares/auth";

const router = Router();

// Máximo 8 intentos de login cada 15 minutos por IP. No cuenta los intentos
// exitosos (skipSuccessfulRequests) — solo protege contra alguien probando
// contraseñas a lo loco, no molesta a alguien que ya entró bien varias veces.
const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: "Demasiados intentos. Espera unos minutos y vuelve a intentar." },
});

router.post("/login", limiteLogin, loginHandler);
router.get("/me", requireAuth, meHandler);
router.patch("/password", requireAuth, cambiarPasswordHandler);

export default router;
