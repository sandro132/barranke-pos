import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import * as espacioController from "./espacio.controller";

const router = Router();

router.use(requireAuth);

router.get("/", espacioController.listarHandler);
router.get("/:id", espacioController.obtenerHandler);
router.post("/", espacioController.crearHandler);
router.patch("/:id", espacioController.actualizarHandler);
router.post("/:id/abrir", espacioController.abrirHandler);
router.post("/:id/cerrar", espacioController.cerrarHandler);
router.post("/:id/unir", espacioController.unirHandler);
router.post("/:id/separar", espacioController.separarHandler);
router.get("/:id/precuenta", espacioController.precuentaHandler);

export default router;
