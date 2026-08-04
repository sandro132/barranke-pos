import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import * as categoriaController from "./categoria.controller";

const router = Router();

router.use(requireAuth);

router.get("/", categoriaController.listarHandler);
router.post("/", categoriaController.crearHandler);
router.patch("/:id", categoriaController.actualizarHandler);
router.delete("/:id", categoriaController.eliminarHandler);

export default router;
