import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

const JWT_ISSUER = "teamsync";
const JWT_ALGORITHM = "HS256";

// Generate short-lived access token
export const generateAccessToken = (userId) => {
  return jwt.sign(
    {
      tokenType: "access",
    },
    env.JWT_ACCESS_SECRET,
    {
      subject: String(userId),
      expiresIn: "15m",
      algorithm: JWT_ALGORITHM,
      issuer: JWT_ISSUER,
    }
  );
};

// Generate refresh token linked to a server-side session
export const generateRefreshToken = (userId, sessionId) => {
  return jwt.sign(
    {
      tokenType: "refresh",
      sid: String(sessionId),
    },
    env.JWT_REFRESH_SECRET,
    {
      subject: String(userId),
      expiresIn: "7d",
      algorithm: JWT_ALGORITHM,
      issuer: JWT_ISSUER,
    }
  );
};

// Verify access token
export const verifyAccessToken = (token) => {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: [JWT_ALGORITHM],
    issuer: JWT_ISSUER,
  });

  if (
    typeof payload === "string" ||
    payload.tokenType !== "access" ||
    typeof payload.sub !== "string"
  ) {
    throw new Error("Invalid access token");
  }

  return payload;
};

// Verify refresh token
export const verifyRefreshToken = (token) => {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, {
    algorithms: [JWT_ALGORITHM],
    issuer: JWT_ISSUER,
  });

  if (
    typeof payload === "string" ||
    payload.tokenType !== "refresh" ||
    typeof payload.sub !== "string" ||
    typeof payload.sid !== "string"
  ) {
    throw new Error("Invalid refresh token");
  }

  return payload;
};