import { Router } from "express";
import { loginHandler, meHandler, cambiarPasswordHandler } from "./auth.controller";
import { requireAuth } from "../../middlewares/auth";

const router = Router();

router.post("/login", loginHandler);
router.get("/me", requireAuth, meHandler);
router.patch("/password", requireAuth, cambiarPasswordHandler);

export default router;
