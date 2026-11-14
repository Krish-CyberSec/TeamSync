import {
  register,
  login,
  getCurrentUser,
  refresh,
  logout,
} from "./auth.controller.js";
import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";

const router = Router();

// POST /register
router.post("/register", register);

// POST /login
router.post("/login", login);

// POST /logout - Invalidate the current refresh token and log out the user
router.post("/logout", logout);

// POST /refresh - Rotate refresh token and issue new access token
router.post("/refresh", refresh);

// GET /me - Get authenticated user's profile
router.get("/me", authenticate, getCurrentUser);



export default router;