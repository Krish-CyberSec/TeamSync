
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
    const validatedData = registerSchema.parse(req.body);
    const user = await registerUser(validatedData);

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

export const login = async (req, res, next) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const user = await loginUser(validatedData);

    // Create a server-tracked refresh session.
    const { refreshToken, session } = await createUserSession(user._id);

    // Bind the access token to this exact session.
    const accessToken = generateAccessToken(
      user._id,
      session._id
    );

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

export const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is missing",
      });
    }

    const {
      refreshToken: newRefreshToken,
      user,
      session,
    } = await rotateUserSession(refreshToken);

    // Bind the new access token to the replacement session.
    const accessToken = generateAccessToken(
      user._id,
      session._id
    );

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

    await revokeUserSession(refreshToken);

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
