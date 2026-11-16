
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
  if (testEmails.length > 0) {
    const users = await User.find({
      email: { $in: testEmails },
    }).select("_id");

    const userIds = users.map((user) => user._id);

    if (userIds.length > 0) {
      await WorkspaceMember.deleteMany({
        user: { $in: userIds },
      });

      await Workspace.deleteMany({
        createdBy: { $in: userIds },
      });

      await Session.deleteMany({
        user: { $in: userIds },
      });

      await User.deleteMany({
        _id: { $in: userIds },
      });
    }
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
    name: "Workspace Test User",
    email: `workspace-${randomUUID()}@example.com`,
    password: "StrongPassword123!",
  };

  testEmails.push(credentials.email);

  const registration = await fetch(
    `${baseUrl}/api/v1/auth/register`,
    {
      method: "POST",
      headers: {
        Origin: env.CLIENT_URL,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    }
  );

  assert.equal(registration.status, 201);

  const login = await fetch(
    `${baseUrl}/api/v1/auth/login`,
    {
      method: "POST",
      headers: {
        Origin: env.CLIENT_URL,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    }
  );

  assert.equal(login.status, 200);

  const loginBody = await login.json();

  return {
    userId: loginBody.data.user.id,
    accessToken: loginBody.data.accessToken,
  };
};

test("Authenticated user can create a workspace and becomes OWNER", async () => {
  const { userId, accessToken } = await createAuthenticatedUser();

  const slug = `workspace-${randomUUID()}`;

  const response = await fetch(
    `${baseUrl}/api/v1/workspaces`,
    {
      method: "POST",
      headers: {
        Origin: env.CLIENT_URL,
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: "Engineering Team",
        slug,
        description: "Engineering workspace",
      }),
    }
  );

  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.success, true);

  assert.equal(body.data.workspace.name, "Engineering Team");
  assert.equal(body.data.workspace.slug, slug);

  const workspace = await Workspace.findOne({ slug });

  assert.ok(workspace);
  assert.equal(workspace.createdBy.toString(), userId);

  const membership = await WorkspaceMember.findOne({
    workspace: workspace._id,
    user: userId,
  });

  assert.ok(membership);
  assert.equal(membership.role, "OWNER");
});

test("Workspace creation rejects unauthenticated requests", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/workspaces`,
    {
      method: "POST",
      headers: {
        Origin: env.CLIENT_URL,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Unauthorized Workspace",
        slug: `unauthorized-${randomUUID()}`,
      }),
    }
  );

  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.success, false);
});

test("Workspace creation rejects invalid input", async () => {
  const { accessToken } = await createAuthenticatedUser();

  const response = await fetch(
    `${baseUrl}/api/v1/workspaces`,
    {
      method: "POST",
      headers: {
        Origin: env.CLIENT_URL,
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: "A",
        slug: "INVALID SLUG",
      }),
    }
  );

  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.equal(body.message, "Validation failed");
});



test("Authenticated user can retrieve only their own workspaces", async () => {
  const userA = await createAuthenticatedUser();
  const userB = await createAuthenticatedUser();

  const workspaceA = {
    name: "User A Workspace",
    slug: `user-a-${randomUUID()}`,
    description: "Private workspace for user A",
  };

  const workspaceB = {
    name: "User B Workspace",
    slug: `user-b-${randomUUID()}`,
    description: "Private workspace for user B",
  };

  const createWorkspace = async (accessToken, workspace) => {
    const response = await fetch(
      `${baseUrl}/api/v1/workspaces`,
      {
        method: "POST",
        headers: {
          Origin: env.CLIENT_URL,
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(workspace),
      }
    );

    assert.equal(response.status, 201);
  };

  await createWorkspace(userA.accessToken, workspaceA);
  await createWorkspace(userB.accessToken, workspaceB);

  const response = await fetch(
    `${baseUrl}/api/v1/workspaces`,
    {
      headers: {
        Authorization: `Bearer ${userA.accessToken}`,
      },
    }
  );

  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.ok(Array.isArray(body.data.workspaces));

  assert.equal(body.data.workspaces.length, 1);

  const returnedWorkspace = body.data.workspaces[0];

  assert.equal(returnedWorkspace.name, workspaceA.name);
  assert.equal(returnedWorkspace.slug, workspaceA.slug);
  assert.equal(returnedWorkspace.role, "OWNER");

  assert.equal(
    body.data.workspaces.some(
      (workspace) => workspace.slug === workspaceB.slug
    ),
    false
  );
});

test("Workspace listing rejects unauthenticated requests", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/workspaces`
  );

  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.success, false);
});
