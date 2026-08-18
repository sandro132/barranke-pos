import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth";
import * as productoController from "./producto.controller";

const router = Router();

router.use(requireAuth);

router.get("/", productoController.listarHandler);
router.get("/:id", productoController.obtenerHandler);
router.post("/", requireRole("ADMIN"), productoController.crearHandler);
router.patch("/:id", requireRole("ADMIN"), productoController.actualizarHandler);
router.post("/:id/desactivar", requireRole("ADMIN"), productoController.desactivarHandler);
router.post("/:id/reactivar", requireRole("ADMIN"), productoController.reactivarHandler);

export default router;
