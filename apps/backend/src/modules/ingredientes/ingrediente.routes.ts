import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth";
import * as ingredienteController from "./ingrediente.controller";

const router = Router();

router.use(requireAuth, requireRole("ADMIN"));

router.get("/", ingredienteController.listarHandler);
router.get("/:id", ingredienteController.obtenerHandler);
router.get("/:id/movimientos", ingredienteController.historialHandler);
router.post("/", ingredienteController.crearHandler);
router.patch("/:id", ingredienteController.actualizarHandler);
router.post("/:id/ajustar-stock", ingredienteController.ajustarStockHandler);
router.delete("/:id", ingredienteController.eliminarHandler);

export default router;
