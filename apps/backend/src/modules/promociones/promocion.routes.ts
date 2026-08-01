import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import * as promocionController from "./promocion.controller";

const router = Router();

router.use(requireAuth);

router.get("/", promocionController.listarHandler);
router.get("/:id", promocionController.obtenerHandler);
router.post("/", promocionController.crearHandler);
router.patch("/:id", promocionController.actualizarHandler);
router.delete("/:id", promocionController.eliminarHandler);

export default router;
