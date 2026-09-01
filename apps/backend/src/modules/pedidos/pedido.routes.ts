import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth";
import * as pedidoController from "./pedido.controller";

const router = Router();

router.use(requireAuth);

router.post("/", requireRole("MESERO"), pedidoController.crearHandler);
router.get("/cocina", requireRole("COCINA"), pedidoController.listarCocinaHandler);
router.get("/barra", requireRole("BAR"), pedidoController.listarBarraHandler);
router.post("/cocina/terminar-todos", requireRole("COCINA"), pedidoController.terminarTodosCocinaHandler);
router.post("/barra/terminar-todos", requireRole("BAR"), pedidoController.terminarTodosBarraHandler);
router.get("/cuenta/:cuentaId", requireRole("MESERO"), pedidoController.listarPorCuentaHandler);
router.post(
  "/cuenta/:cuentaId/repetir-ultima-ronda",
  requireRole("MESERO"),
  pedidoController.repetirUltimaRondaHandler
);
// Cocina y Barra marcan sus propios ítems como preparando/listo.
router.patch(
  "/items/:itemId/estado",
  requireRole("COCINA", "BAR"),
  pedidoController.actualizarEstadoItemHandler
);
router.post("/items/:itemId/cancelar", requireRole("MESERO"), pedidoController.cancelarItemHandler);

export default router;
