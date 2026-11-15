
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";

import { env } from "../../src/config/env.js";
import User from "../../src/modules/users/user.model.js";
import Session from "../../src/modules/auth/session.model.js";

import {
  createUserSession,
  revokeUserSession,
} from "../../src/modules/auth/auth.service.js";

import { hashRefreshToken } from "../../src/utils/token-hash.js";

const testUserIds = [];

before(async () => {
  await mongoose.connect(env.MONGO_URI, {
    dbName: "teamsync_test",
  });
});

after(async () => {
  if (testUserIds.length > 0) {
    await Session.deleteMany({
      user: { $in: testUserIds },
    });

    await User.deleteMany({
      _id: { $in: testUserIds },
    });
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

const createTestUser = async () => {
  const user = await User.create({
    name: "TeamSync Logout Test User",
    email: `teamsync-logout-${randomUUID()}@example.com`,
    passwordHash: "temporary-test-password",
  });

  testUserIds.push(user._id);

  return user;
};

// TEST 1: Valid refresh token revokes its session.
test("Valid refresh token revokes the matching session", async () => {
  const user = await createTestUser();
  const original = await createUserSession(user._id);

  const result = await revokeUserSession(original.refreshToken);

  const session = await Session.findById(original.session._id);

  assert.equal(result, true);
  assert.ok(session.revokedAt);
});

// TEST 2: Invalid token cannot revoke an unrelated session.
test("Invalid refresh token does not revoke an active session", async () => {
  const user = await createTestUser();
  const original = await createUserSession(user._id);

  const result = await revokeUserSession("invalid-refresh-token");

  const session = await Session.findById(original.session._id);

  assert.equal(result, false);
  assert.equal(session.revokedAt, null);
});

// TEST 3: Repeated logout is safe.
test("Repeated logout does not modify an already revoked session", async () => {
  const user = await createTestUser();
  const original = await createUserSession(user._id);

  const firstResult = await revokeUserSession(original.refreshToken);

  const sessionAfterFirstLogout = await Session.findById(
    original.session._id
  );

  const firstRevokedAt = sessionAfterFirstLogout.revokedAt;

  const secondResult = await revokeUserSession(original.refreshToken);

  const sessionAfterSecondLogout = await Session.findById(
    original.session._id
  );

  assert.equal(firstResult, true);
  assert.equal(secondResult, false);

  assert.equal(
    sessionAfterSecondLogout.revokedAt.getTime(),
    firstRevokedAt.getTime()
  );
});

// TEST 4: Logout affects only the selected device session.
test("Logout from one device does not revoke another device session", async () => {
  const user = await createTestUser();

  const deviceOne = await createUserSession(user._id);
  const deviceTwo = await createUserSession(user._id);

  const result = await revokeUserSession(deviceOne.refreshToken);

  const firstSession = await Session.findById(deviceOne.session._id);
  const secondSession = await Session.findById(deviceTwo.session._id);

  assert.equal(result, true);
  assert.ok(firstSession.revokedAt);
  assert.equal(secondSession.revokedAt, null);
});

// TEST 5: Expired JWT cannot be used to revoke a session.
test("Expired refresh JWT cannot be used for logout session access", async () => {
  const user = await createTestUser();

  const sessionId = new mongoose.Types.ObjectId();

  const expiredToken = jwt.sign(
    {
      tokenType: "refresh",
      sid: String(sessionId),
    },
    env.JWT_REFRESH_SECRET,
    {
      subject: String(user._id),
      expiresIn: -1,
      algorithm: "HS256",
      issuer: "teamsync",
    }
  );

  const session = await Session.create({
    _id: sessionId,
    user: user._id,
    familyId: sessionId,
    tokenHash: hashRefreshToken(expiredToken),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  const result = await revokeUserSession(expiredToken);

  const storedSession = await Session.findById(session._id);

  assert.equal(result, false);
  assert.equal(storedSession.revokedAt, null);
});
