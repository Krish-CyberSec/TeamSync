
import { registerSchema } from "./auth.validation.js";
import { registerUser } from "./auth.service.js";

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
