
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

import {
  loginLimiter,
  registerLimiter,
  refreshLimiter,
} from "../../middleware/rate-limit.middleware.js";

const router = Router();

router.post(
  "/register",
  registerLimiter,
  requireTrustedOrigin,
  register
);

router.post(
  "/login",
  loginLimiter,
  requireTrustedOrigin,
  login
);

router.post(
  "/refresh",
  refreshLimiter,
  requireTrustedOrigin,
  refresh
);

router.post(
  "/logout",
  requireTrustedOrigin,
  logout
);

router.get("/me", refreshLimiter, authenticate, getCurrentUser);

export default router;
