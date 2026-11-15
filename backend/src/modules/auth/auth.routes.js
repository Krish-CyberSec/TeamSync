
import { Router } from "express";

import {
  register,
  login,
  getCurrentUser,
  refresh,
  logout,
} from "./auth.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requireTrustedOrigin } from "../../middleware/origin.middleware.js";

const router = Router();

router.post("/register", requireTrustedOrigin, register);
router.post("/login", requireTrustedOrigin, login);
router.post("/refresh", requireTrustedOrigin, refresh);
router.post("/logout", requireTrustedOrigin, logout);

router.get("/me", authenticate, getCurrentUser);

export default router;
