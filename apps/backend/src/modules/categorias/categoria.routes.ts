import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth";
import * as categoriaController from "./categoria.controller";

const router = Router();

router.use(requireAuth, requireRole("ADMIN"));

router.get("/", categoriaController.listarHandler);
router.post("/", categoriaController.crearHandler);
router.patch("/:id", categoriaController.actualizarHandler);
router.delete("/:id", categoriaController.eliminarHandler);

export default router;
