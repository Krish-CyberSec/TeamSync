
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

import { env } from "../../src/config/env.js";
import User from "../../src/modules/users/user.model.js";
import Session from "../../src/modules/auth/session.model.js";

import {
  createUserSession,
  rotateUserSession,
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

// Creates a unique test user for each scenario.
const createTestUser = async () => {
  const user = await User.create({
    name: "TeamSync Test User",
    email: `teamsync-test-${randomUUID()}@example.com`,
    passwordHash: "temporary-test-password",
  });

  testUserIds.push(user._id);

  return user;
};

// TEST 1: Valid refresh token rotation.
test("Valid refresh token creates a replacement session", async () => {
  const user = await createTestUser();

  const original = await createUserSession(user._id);

  const result = await rotateUserSession(original.refreshToken);

  const oldSession = await Session.findById(original.session._id)
    .select("+tokenHash");

  const newSession = await Session.findById(result.session._id)
    .select("+tokenHash");

  assert.ok(oldSession.revokedAt);
  assert.ok(newSession);
  assert.equal(newSession.revokedAt, null);

  assert.equal(
    String(newSession.familyId),
    String(original.session.familyId)
  );

  assert.equal(
    newSession.tokenHash,
    hashRefreshToken(result.refreshToken)
  );

  assert.equal(
    String(newSession.user),
    String(user._id)
  );
});

// TEST 2: Invalid refresh token is rejected.
test("Invalid refresh token is rejected", async () => {
  await assert.rejects(
    rotateUserSession("this-is-not-a-valid-jwt"),
    (error) => error.statusCode === 401
  );
});

// TEST 3: Reusing a revoked token revokes the entire family.
test("Refresh token reuse revokes all active family sessions", async () => {
  const user = await createTestUser();

  const original = await createUserSession(user._id);

  // First use: successfully rotate the token.
  const rotated = await rotateUserSession(original.refreshToken);

  // Second use: reuse the already-revoked original token.
  await assert.rejects(
    rotateUserSession(original.refreshToken),
    (error) => error.statusCode === 401
  );

  const familySessions = await Session.find({
    familyId: original.session.familyId,
  });

  assert.equal(familySessions.length, 2);

  for (const session of familySessions) {
    assert.ok(
      session.revokedAt,
      "Every session in the family should be revoked"
    );
  }

  // The replacement token should no longer be usable.
  await assert.rejects(
    rotateUserSession(rotated.refreshToken),
    (error) => error.statusCode === 401
  );
});



test("Concurrent refresh requests cannot create two active descendants", async () => {
  const user = await createTestUser();

  const original = await createUserSession(user._id);

  // Both requests submit exactly the same refresh token.
  const results = await Promise.allSettled([
    rotateUserSession(original.refreshToken),
    rotateUserSession(original.refreshToken),
  ]);

  const successfulRequests = results.filter(
    (result) => result.status === "fulfilled"
  );

  const rejectedRequests = results.filter(
    (result) => result.status === "rejected"
  );

  // One request may rotate successfully; the other must be rejected.
  assert.equal(successfulRequests.length, 1);
  assert.equal(rejectedRequests.length, 1);

  assert.equal(rejectedRequests[0].reason.statusCode, 401);

  // Reuse detection should revoke the entire original token family.
  const familySessions = await Session.find({
    familyId: original.session.familyId,
  });

  assert.equal(familySessions.length, 2);

  for (const session of familySessions) {
    assert.ok(
      session.revokedAt,
      "No session in the reused token family should remain active"
    );
  }
});


test("Suspended account cannot rotate refresh token", async () => {
  const user = await createTestUser();

  const original = await createUserSession(user._id);

  // Administrator suspends the account.
  await User.findByIdAndUpdate(user._id, {
    $set: { status: "suspended" },
  });

  // The JWT is still valid, but the account is suspended.
  await assert.rejects(
    rotateUserSession(original.refreshToken),
    (error) => error.statusCode === 403
  );

  const familySessions = await Session.find({
    familyId: original.session.familyId,
  });

  assert.equal(familySessions.length, 1);
  assert.ok(familySessions[0].revokedAt);
});


test("Expired database session cannot be rotated", async () => {
  const user = await createTestUser();

  const original = await createUserSession(user._id);

  // Expire the database session manually.
  await Session.findByIdAndUpdate(original.session._id, {
    $set: {
      expiresAt: new Date(Date.now() - 60 * 1000),
    },
  });

  // JWT itself is still within its seven-day validity period.
  await assert.rejects(
    rotateUserSession(original.refreshToken),
    (error) => error.statusCode === 401
  );

  const familySessions = await Session.find({
    familyId: original.session.familyId,
  });

  assert.equal(familySessions.length, 1);
  assert.equal(familySessions[0].revokedAt, null);
});
