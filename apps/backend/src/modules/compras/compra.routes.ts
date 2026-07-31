import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import * as compraController from "./compra.controller";

const router = Router();

router.use(requireAuth);

router.get("/", compraController.listarHandler);
router.get("/:id", compraController.obtenerHandler);
router.post("/", compraController.crearHandler);

export default router;
