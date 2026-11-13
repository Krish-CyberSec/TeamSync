
import User from "../users/user.model.js";

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
