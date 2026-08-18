import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth";
import * as espacioController from "./espacio.controller";

const router = Router();

router.use(requireAuth);

router.get("/", espacioController.listarHandler);
router.get("/:id", espacioController.obtenerHandler);
router.post("/", requireRole("ADMIN"), espacioController.crearHandler);
router.patch("/:id", requireRole("ADMIN"), espacioController.actualizarHandler);
router.delete("/:id", requireRole("ADMIN"), espacioController.eliminarHandler);

export default router;
