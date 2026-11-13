import { Router } from "express";
import { register } from "./auth.controller.js";

const router = Router();

// POST /register
router.post("/register", register);

export default router;