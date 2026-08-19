import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth";
import * as gastoController from "./gasto.controller";

const router = Router();

router.use(requireAuth, requireRole("ADMIN"));

router.get("/", gastoController.listarHandler);
router.post("/", gastoController.crearHandler);
router.patch("/:id", gastoController.actualizarHandler);
router.delete("/:id", gastoController.eliminarHandler);

export default router;
