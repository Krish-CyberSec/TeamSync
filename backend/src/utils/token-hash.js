
import crypto from "node:crypto";

// Generate SHA-256 hash of a refresh token
export const hashRefreshToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};
