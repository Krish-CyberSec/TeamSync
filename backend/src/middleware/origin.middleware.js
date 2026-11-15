
import { env } from "../config/env.js";

const trustedOrigin = new URL(env.CLIENT_URL).origin;

export const requireTrustedOrigin = (req, res, next) => {
  const requestOrigin = req.get("Origin");

  if (!requestOrigin || requestOrigin !== trustedOrigin) {
    return res.status(403).json({
      success: false,
      message: "Request origin is not allowed",
    });
  }

  next();
};
