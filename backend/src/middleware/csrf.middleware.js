
import { verifyCsrfToken } from "../utils/csrf-token.js";

export const requireCsrfToken = (req, res, next) => {
  try {
    // Read the CSRF token from the browser-readable cookie.
    const csrfCookie = req.cookies?.csrfToken;

    // Read the same token from the custom request header.
    const csrfHeader = req.get("X-CSRF-Token");

    // Read the HttpOnly refresh token.
    const refreshToken = req.cookies?.refreshToken;

    // Both cookie and header must be present and identical.
    if (
      !csrfCookie ||
      !csrfHeader ||
      !refreshToken ||
      csrfCookie !== csrfHeader
    ) {
      return res.status(403).json({
        success: false,
        message: "CSRF token is missing or invalid",
      });
    }

    // Verify the token's signature, expiry and refresh-token binding.
    const isValid = verifyCsrfToken(csrfHeader, refreshToken);

    if (!isValid) {
      return res.status(403).json({
        success: false,
        message: "CSRF token is invalid or expired",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
