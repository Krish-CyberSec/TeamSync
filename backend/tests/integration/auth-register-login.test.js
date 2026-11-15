
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

import { env } from "../../src/config/env.js";
import app from "../../src/app.js";
import User from "../../src/modules/users/user.model.js";
import Session from "../../src/modules/auth/session.model.js";
import { verifyAccessToken } from "../../src/utils/token.js";

let server;
let baseUrl;

const testEmails = [];

before(async () => {
  await mongoose.connect(env.MONGO_URI, {
    dbName: "teamsync_test",
  });

  app.set("trust proxy", "loopback");

  server = app.listen(0);

  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server?.listening) {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  if (testEmails.length > 0) {
    const users = await User.find({
      email: { $in: testEmails },
    }).select("_id");

    const userIds = users.map((user) => user._id);

    if (userIds.length > 0) {
      await Session.deleteMany({
        user: { $in: userIds },
      });

      await User.deleteMany({
        _id: { $in: userIds },
      });
    }
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

const createCredentials = () => {
  const email = `teamsync-auth-${randomUUID()}@example.com`;

  testEmails.push(email);

  return {
    name: "TeamSync Integration User",
    email,
    password: "StrongPassword123!",
  };
};

const sendRequest = async (endpoint, body, clientIp) => {
  return fetch(`${baseUrl}/api/v1/auth/${endpoint}`, {
    method: "POST",
    headers: {
      Origin: env.CLIENT_URL,
      "Content-Type": "application/json",
      "X-Forwarded-For": clientIp,
    },
    body: JSON.stringify(body),
  });
};

// 1. Successful registration
test("Registration creates a user and returns safe user data", async () => {
  const credentials = createCredentials();

  const response = await sendRequest(
    "register",
    credentials,
    "198.51.100.10"
  );

  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.success, true);
  assert.equal(body.message, "Account registered successfully");

  assert.equal(body.data.user.email, credentials.email);
  assert.equal(body.data.user.name, credentials.name);
  assert.equal(body.data.user.status, "active");

  assert.equal(body.data.user.passwordHash, undefined);
  assert.equal(body.data.user.password, undefined);

  const storedUser = await User.findOne({
    email: credentials.email,
  }).select("+passwordHash");

  assert.ok(storedUser);
  assert.notEqual(storedUser.passwordHash, credentials.password);

  assert.equal(
    await storedUser.comparePassword(credentials.password),
    true
  );
});

// 2. Duplicate email
test("Registration rejects duplicate email addresses", async () => {
  const credentials = createCredentials();

  const firstResponse = await sendRequest(
    "register",
    credentials,
    "198.51.100.11"
  );

  assert.equal(firstResponse.status, 201);

  const duplicateResponse = await sendRequest(
    "register",
    credentials,
    "198.51.100.11"
  );

  const body = await duplicateResponse.json();

  assert.equal(duplicateResponse.status, 409);
  assert.equal(body.success, false);
  assert.equal(body.message, "Email is already registered");
});

// 3. Invalid registration input
test("Registration rejects invalid input", async () => {
  const credentials = createCredentials();

  const response = await sendRequest(
    "register",
    {
      ...credentials,
      password: "short",
    },
    "198.51.100.12"
  );

  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.equal(body.message, "Validation failed");

  assert.ok(
    body.errors.some((error) => error.field === "password")
  );
});

// 4. Unexpected fields
test("Registration rejects unexpected fields", async () => {
  const credentials = createCredentials();

  const response = await sendRequest(
    "register",
    {
      ...credentials,
      role: "ADMIN",
    },
    "198.51.100.13"
  );

  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.equal(body.message, "Validation failed");
});

// 5. Successful login
test("Login succeeds and issues access token and refresh cookie", async () => {
  const credentials = createCredentials();
  const clientIp = "198.51.100.14";

  const registration = await sendRequest(
    "register",
    credentials,
    clientIp
  );

  assert.equal(registration.status, 201);

  const response = await sendRequest(
    "login",
    {
      email: credentials.email,
      password: credentials.password,
    },
    clientIp
  );

  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.message, "Login successful");

  assert.equal(body.data.user.email, credentials.email);
  assert.equal(body.data.tokenType, "Bearer");
  assert.equal(body.data.expiresIn, 900);

  assert.ok(body.data.accessToken);

  const accessPayload = verifyAccessToken(body.data.accessToken);

  assert.equal(accessPayload.sub, body.data.user.id);
  assert.equal(accessPayload.tokenType, "access");

  const cookies = response.headers.getSetCookie();

  const refreshCookie = cookies.find((cookie) =>
    cookie.startsWith("refreshToken=")
  );

  assert.ok(refreshCookie);
  assert.match(refreshCookie, /HttpOnly/i);
  assert.match(refreshCookie, /Path=\/api\/v1\/auth/i);
  assert.match(refreshCookie, /SameSite=Lax/i);

  assert.equal(body.data.user.passwordHash, undefined);
});

// 6. Incorrect password
test("Login rejects an incorrect password", async () => {
  const credentials = createCredentials();
  const clientIp = "198.51.100.15";

  const registration = await sendRequest(
    "register",
    credentials,
    clientIp
  );

  assert.equal(registration.status, 201);

  const response = await sendRequest(
    "login",
    {
      email: credentials.email,
      password: "WrongPassword123!",
    },
    clientIp
  );

  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.success, false);
  assert.equal(body.message, "Invalid email or password");
});

// 7. Unknown email
test("Login rejects an unknown email with generic error", async () => {
  const credentials = createCredentials();

  const response = await sendRequest(
    "login",
    {
      email: credentials.email,
      password: credentials.password,
    },
    "198.51.100.17"
  );

  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.message, "Invalid email or password");
});

// 8. Suspended account
test("Login rejects suspended accounts", async () => {
  const credentials = createCredentials();
  const clientIp = "198.51.100.16";

  const registration = await sendRequest(
    "register",
    credentials,
    clientIp
  );

  assert.equal(registration.status, 201);

  await User.updateOne(
    { email: credentials.email },
    { $set: { status: "suspended" } }
  );

  const response = await sendRequest(
    "login",
    {
      email: credentials.email,
      password: credentials.password,
    },
    clientIp
  );

  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(body.message, "Account is unavailable");
});

// 9. Invalid login input
test("Login rejects invalid email and missing password", async () => {
  const response = await sendRequest(
    "login",
    {
      email: "not-an-email",
    },
    "198.51.100.18"
  );

  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.equal(body.message, "Validation failed");
});
