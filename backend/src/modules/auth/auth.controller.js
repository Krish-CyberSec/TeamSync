
import { registerSchema, loginSchema } from "./auth.validation.js";
import { registerUser, loginUser } from "./auth.service.js";

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
    // Validate incoming login data
    const validatedData = loginSchema.parse(req.body);

    // Authenticate user
    const user = await loginUser(validatedData);

    // Send safe user information
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
      },
    });
  } catch (error) {
    next(error);
  }
};
