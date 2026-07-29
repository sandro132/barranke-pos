import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import * as recetaController from "./receta.controller";

// mergeParams: true para poder leer :productoId cuando este router
// se monta dentro de /api/productos/:productoId/receta
const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get("/", recetaController.obtenerHandler);
router.post("/", recetaController.agregarItemHandler);
router.patch("/:ingredienteId", recetaController.actualizarItemHandler);
router.delete("/:ingredienteId", recetaController.eliminarItemHandler);

export default router;
