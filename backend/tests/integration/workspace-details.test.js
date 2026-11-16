
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

import { env } from "../../src/config/env.js";
import app from "../../src/app.js";

import User from "../../src/modules/users/user.model.js";
import Session from "../../src/modules/auth/session.model.js";
import Workspace from "../../src/modules/workspaces/workspace.model.js";
import WorkspaceMember from "../../src/modules/workspaces/workspace-member.model.js";

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
  const users = await User.find({
    email: { $in: testEmails },
  }).select("_id");

  const userIds = users.map((user) => user._id);

  if (userIds.length > 0) {
    await WorkspaceMember.deleteMany({ user: { $in: userIds } });
    await Workspace.deleteMany({ createdBy: { $in: userIds } });
    await Session.deleteMany({ user: { $in: userIds } });
    await User.deleteMany({ _id: { $in: userIds } });
  }

  if (server?.listening) {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

const createAuthenticatedUser = async () => {
  const credentials = {
    name: "Workspace Details Tester",
    email: `details-${randomUUID()}@example.com`,
    password: "StrongPassword123!",
  };

  testEmails.push(credentials.email);

  const registration = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: "POST",
    headers: {
      Origin: env.CLIENT_URL,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  assert.equal(registration.status, 201);

  const login = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      Origin: env.CLIENT_URL,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
    }),
  });

  assert.equal(login.status, 200);

  const body = await login.json();

  return {
    userId: body.data.user.id,
    accessToken: body.data.accessToken,
  };
};

const createWorkspace = async (accessToken) => {
  const response = await fetch(`${baseUrl}/api/v1/workspaces`, {
    method: "POST",
    headers: {
      Origin: env.CLIENT_URL,
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      name: "Details Test Workspace",
      slug: `details-${randomUUID()}`,
      description: "Workspace details integration test",
    }),
  });

  assert.equal(response.status, 201);

  const body = await response.json();
  return body.data.workspace;
};

test("Workspace member can retrieve workspace details", async () => {
  const user = await createAuthenticatedUser();
  const workspace = await createWorkspace(user.accessToken);

  const response = await fetch(
    `${baseUrl}/api/v1/workspaces/${workspace.id}`,
    {
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
      },
    }
  );

  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.workspace.id, workspace.id);
  assert.equal(body.data.workspace.role, "OWNER");
});

test("Non-member cannot retrieve workspace details", async () => {
  const owner = await createAuthenticatedUser();
  const nonMember = await createAuthenticatedUser();

  const workspace = await createWorkspace(owner.accessToken);

  const response = await fetch(
    `${baseUrl}/api/v1/workspaces/${workspace.id}`,
    {
      headers: {
        Authorization: `Bearer ${nonMember.accessToken}`,
      },
    }
  );

  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
});

test("Workspace details rejects invalid ObjectId", async () => {
  const user = await createAuthenticatedUser();

  const response = await fetch(
    `${baseUrl}/api/v1/workspaces/invalid-id`,
    {
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
      },
    }
  );

  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
});

test("Workspace details rejects unauthenticated requests", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/workspaces/${new mongoose.Types.ObjectId()}`
  );

  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.success, false);
});
