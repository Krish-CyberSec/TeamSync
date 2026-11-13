
import User from "../users/user.model.js";

// Registration service function
export const registerUser = async ({ name, email, password }) => {
  // Check whether the email is already registered
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    const error = new Error("Email is already registered");
    error.statusCode = 409;
    throw error;
  }

  // Create a new user document
  const user = new User({
    name,
    email,
    passwordHash: password,
  });

  // Save the user; the pre-save hook hashes the password
  await user.save();

  return user;
};

// Login service function


export const loginUser = async ({ email, password }) => {
  // Find user and explicitly retrieve password hash
  const user = await User.findOne({ email })
    .select("+passwordHash");

  // Use a generic error for unknown email or wrong password
  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  // Check whether account is allowed to log in
  if (user.status !== "active") {
    const error = new Error("Account is unavailable");
    error.statusCode = 403;
    throw error;
  }

  // Compare submitted password with stored bcrypt hash
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  return user;
};