
import User from "../users/user.model.js";
import Session from "./session.model.js";
import {
  generateRefreshToken,
  verifyRefreshToken,
} from "../../utils/token.js";
import { hashRefreshToken } from "../../utils/token-hash.js";
import mongoose from "mongoose";
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




// Create a refresh-token session for the authenticated user


export const createUserSession = async (userId) => {
  const REFRESH_TOKEN_LIFETIME = 7 * 24 * 60 * 60 * 1000;

  // Generate session ID before creating the document
  const sessionId = new mongoose.Types.ObjectId();

  // Initial session starts a new refresh-token family
  const familyId = sessionId;

  // Generate refresh token linked to this session
  const refreshToken = generateRefreshToken(userId, sessionId);

  // Hash the refresh token
  const tokenHash = hashRefreshToken(refreshToken);

  // Create session with the actual token hash
  const session = await Session.create({
    _id: sessionId,
    user: userId,
    familyId,
    tokenHash,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_LIFETIME),
  });

  return {
    refreshToken,
    session,
  };
};


// Rotate a refresh token and create its replacement session
export const rotateUserSession = async (refreshToken) => {
  let payload;

  // Step 1: Verify the refresh JWT
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    const error = new Error("Invalid or expired refresh token");
    error.statusCode = 401;
    throw error;
  }

  // Step 2: Validate IDs before querying MongoDB
  if (
    !mongoose.isValidObjectId(payload.sub) ||
    !mongoose.isValidObjectId(payload.sid)
  ) {
    const error = new Error("Invalid refresh token");
    error.statusCode = 401;
    throw error;
  }

  const dbSession = await mongoose.startSession();

  let outcome = "invalid";
  let rotatedSession = null;

  try {
    await dbSession.withTransaction(async () => {
      const now = new Date();

      // Reset these values if MongoDB retries the transaction
      outcome = "invalid";
      rotatedSession = null;

      // Step 3: Find the existing session
      const currentSession = await Session.findOne({
        _id: payload.sid,
        user: payload.sub,
      })
        .select("+tokenHash")
        .session(dbSession);

      if (!currentSession) {
        outcome = "invalid";
        return;
      }

      // Step 4: Verify the stored token hash
      const submittedHash = hashRefreshToken(refreshToken);

      if (currentSession.tokenHash !== submittedHash) {
        outcome = "invalid";
        return;
      }

      // Step 5: Check explicit expiration
      if (currentSession.expiresAt <= now) {
        outcome = "expired";
        return;
      }

      // Step 6: Detect reuse of an already-revoked token
      if (currentSession.revokedAt) {
        await Session.updateMany(
          {
            familyId: currentSession.familyId,
            revokedAt: null,
          },
          {
            $set: { revokedAt: now },
          },
          { session: dbSession }
        );

        outcome = "replay";
        return;
      }

      // Step 7: Verify that the account is still active
      const user = await User.findById(payload.sub).session(dbSession);

      if (!user || user.status !== "active") {
        await Session.updateMany(
          {
            familyId: currentSession.familyId,
            revokedAt: null,
          },
          {
            $set: { revokedAt: now },
          },
          { session: dbSession }
        );

        outcome = "unavailable";
        return;
      }

      // Step 8: Generate the replacement session
      const newSessionId = new mongoose.Types.ObjectId();

      const newRefreshToken = generateRefreshToken(
        payload.sub,
        newSessionId
      );

      const newTokenHash = hashRefreshToken(newRefreshToken);

      // Step 9: Atomically claim and revoke the old session
      const claimedSession = await Session.findOneAndUpdate(
        {
          _id: currentSession._id,
          tokenHash: submittedHash,
          revokedAt: null,
          expiresAt: { $gt: now },
        },
        {
          $set: {
            revokedAt: now,
            lastUsedAt: now,
            replacedBySession: newSessionId,
          },
        },
        {
          returnDocument: "after",
          session: dbSession,
        }
      );

      if (!claimedSession) {
        outcome = "invalid";
        return;
      }

      // Step 10: Create the new session in the same family
      const newSession = new Session({
        _id: newSessionId,
        user: payload.sub,
        familyId: currentSession.familyId,
        tokenHash: newTokenHash,
        expiresAt: new Date(
          now.getTime() + 7 * 24 * 60 * 60 * 1000
        ),
      });

      await newSession.save({ session: dbSession });

      rotatedSession = {
        refreshToken: newRefreshToken,
        user,
        session: newSession,
      };

      outcome = "success";
    });
  } finally {
    await dbSession.endSession();
  }

  // Step 11: Handle the committed transaction outcome
  if (outcome === "replay") {
    const error = new Error(
      "Refresh token reuse detected. Please log in again."
    );
    error.statusCode = 401;
    throw error;
  }

  if (outcome === "unavailable") {
    const error = new Error("Account is unavailable");
    error.statusCode = 403;
    throw error;
  }

  if (outcome !== "success" || !rotatedSession) {
    const error = new Error("Invalid or expired refresh token");
    error.statusCode = 401;
    throw error;
  }

  return rotatedSession;
};



export const revokeUserSession = async (refreshToken) => {
  // Missing or malformed tokens cannot identify a session.
  if (typeof refreshToken !== "string" || !refreshToken) {
    return false;
  }

  let payload;

  // Verify the token before trusting its user and session IDs.
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    // Invalid or expired tokens cannot be used for session access.
    return false;
  }

  if (
    !mongoose.isValidObjectId(payload.sub) ||
    !mongoose.isValidObjectId(payload.sid)
  ) {
    return false;
  }

  const tokenHash = hashRefreshToken(refreshToken);

  // Revoke only the matching active session.
  const result = await Session.updateOne(
    {
      _id: payload.sid,
      user: payload.sub,
      tokenHash,
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
      },
    }
  );

  return result.modifiedCount === 1;
};
