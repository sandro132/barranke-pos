import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth";
import * as usuarioController from "./usuario.controller";

const router = Router();

router.use(requireAuth, requireRole("ADMIN"));

router.get("/", usuarioController.listarHandler);
router.post("/", usuarioController.crearHandler);
router.patch("/:id", usuarioController.actualizarHandler);
router.post("/:id/resetear-password", usuarioController.resetearPasswordHandler);

export default router;
