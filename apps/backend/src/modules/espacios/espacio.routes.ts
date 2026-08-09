import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import * as espacioController from "./espacio.controller";

const router = Router();

router.use(requireAuth);

router.get("/", espacioController.listarHandler);
router.get("/:id", espacioController.obtenerHandler);
router.post("/", espacioController.crearHandler);
router.patch("/:id", espacioController.actualizarHandler);

export default router;
