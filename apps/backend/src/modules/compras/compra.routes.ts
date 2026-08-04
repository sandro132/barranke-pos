import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import * as compraController from "./compra.controller";

const router = Router();

router.use(requireAuth);

router.get("/", compraController.listarHandler);
router.get("/:id", compraController.obtenerHandler);
router.post("/", compraController.crearHandler);
router.patch("/:id", compraController.actualizarHandler);
router.delete("/:id", compraController.anularHandler);

export default router;
