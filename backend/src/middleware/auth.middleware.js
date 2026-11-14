
import User from "../modules/users/user.model.js";
import { verifyAccessToken } from "../utils/token.js";
import mongoose from "mongoose";

// Authenticate requests using an access token
export const authenticate = async (req, res, next) => {
    try {
        // 1. Read the Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        // 2. Extract the Bearer token
        const parts = authHeader.trim().split(/\s+/);

        if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
            return res.status(401).json({
                success: false,
                message: "Invalid authorization format",
            });
        }

        const token = parts[1];

        // 3. Verify the access token
        let payload;

        try {
            payload = verifyAccessToken(token);
        } catch {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired access token",
            });
        }

        // Validate MongoDB user ID from the token
        if (!mongoose.isValidObjectId(payload.sub)) {
            return res.status(401).json({
                success: false,
                message: "Invalid access token",
            });
        }

        // 4. Find the user and check account status
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

        // 5. Attach authenticated user to the request
        req.user = {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            status: user.status,
        };

        // 6. Continue to the next middleware or route
        next();
    } catch (error) {
        next(error);
    }
};
