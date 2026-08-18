import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth";
import * as promocionController from "./promocion.controller";

const router = Router();

router.use(requireAuth);

router.get("/", promocionController.listarHandler);
router.get("/:id", promocionController.obtenerHandler);
router.post("/", requireRole("ADMIN"), promocionController.crearHandler);
router.patch("/:id", requireRole("ADMIN"), promocionController.actualizarHandler);
router.delete("/:id", requireRole("ADMIN"), promocionController.eliminarHandler);

export default router;
