import { generateAccessToken } from "../../utils/token.js";
import { registerSchema, loginSchema } from "./auth.validation.js";
import {
  registerUser,
  loginUser,
  createUserSession,
  rotateUserSession,
  revokeUserSession,
} from "./auth.service.js";

import { env } from "../../config/env.js";
const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/v1/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const register = async (req, res, next) => {
  try {
    // Validate incoming registration data
    const validatedData = registerSchema.parse(req.body);

    // Execute registration business logic
    const user = await registerUser(validatedData);

    // Send safe response
    return res.status(201).json({
      success: true,
      message: "Account registered successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          status: user.status,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Login controller function

export const login = async (req, res, next) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const user = await loginUser(validatedData);

    // Create a server-tracked refresh session
    const { refreshToken } = await createUserSession(user._id);

    // Generate short-lived access token
    const accessToken = generateAccessToken(user._id);

    // Store refresh token in an HttpOnly cookie
    res.cookie("refreshToken", refreshToken, refreshCookieOptions);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          status: user.status,
        },
        accessToken,
        tokenType: "Bearer",
        expiresIn: 900,
      },
    });
  } catch (error) {
    next(error);
  }
};


// Get the currently authenticated user's profile
export const getCurrentUser = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      message: "User profile retrieved successfully",
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Refresh access token using the HttpOnly refresh cookie
export const refresh = async (req, res, next) => {
  try {
    // Read refresh token from the incoming cookie
    const refreshToken = req.cookies?.refreshToken;

    // Reject requests without a refresh token
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is missing",
      });
    }

    // Validate and rotate the refresh token
    const { refreshToken: newRefreshToken, user } =
      await rotateUserSession(refreshToken);

    // Generate a new short-lived access token
    const accessToken = generateAccessToken(user._id);

    // Replace the old refresh cookie
    res.cookie(
      "refreshToken",
      newRefreshToken,
      refreshCookieOptions
    );

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          status: user.status,
        },
        accessToken,
        tokenType: "Bearer",
        expiresIn: 900,
      },
    });
  } catch (error) {
    next(error);
  }
};


export const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    // Revoke the matching server-side session, if possible.
    await revokeUserSession(refreshToken);

    // Clear the browser cookie regardless of token validity.
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/v1/auth",
    });

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    next(error);
  }
};
