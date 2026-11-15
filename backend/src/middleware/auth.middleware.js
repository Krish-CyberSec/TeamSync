
import User from "../modules/users/user.model.js";
import Session from "../modules/auth/session.model.js";
import { verifyAccessToken } from "../utils/token.js";
import mongoose from "mongoose";

// Authenticate requests using a session-bound access token
export const authenticate = async (req, res, next) => {
  try {
    // 1. Read Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // 2. Extract Bearer token
    const parts = authHeader.trim().split(/\s+/);

    if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format",
      });
    }

    const token = parts[1];

    // 3. Verify JWT
    let payload;

    try {
      payload = verifyAccessToken(token);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired access token",
      });
    }

    // 4. Validate user and session IDs
    if (
      !mongoose.isValidObjectId(payload.sub) ||
      !mongoose.isValidObjectId(payload.sid)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid access token",
      });
    }

    // 5. Verify user account
    const user = await User.findById(payload.sub).select(
      "name email status"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Account is unavailable",
      });
    }

    // 6. Verify the exact session associated with the access token
    const session = await Session.findOne({
      _id: payload.sid,
      user: payload.sub,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }).select("_id");

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Session is invalid or revoked",
      });
    }

    // 7. Attach authenticated user to request
    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      status: user.status,
      sessionId: session._id.toString(),
    };

    next();
  } catch (error) {
    next(error);
  }
};
