import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import * as productoController from "./producto.controller";

const router = Router();

router.use(requireAuth);

router.get("/", productoController.listarHandler);
router.get("/:id", productoController.obtenerHandler);
router.post("/", productoController.crearHandler);
router.patch("/:id", productoController.actualizarHandler);
router.post("/:id/desactivar", productoController.desactivarHandler);
router.post("/:id/reactivar", productoController.reactivarHandler);

export default router;
