
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
let workspace;

const users = {};
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

  const createUser = async (role) => {
    const credentials = {
      name: `Workspace ${role}`,
      email: `${role.toLowerCase()}-${randomUUID()}@example.com`,
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

    const body = await login.json();

    return {
      id: body.data.user.id,
      accessToken: body.data.accessToken,
    };
  };

  users.owner = await createUser("OWNER");
  users.admin = await createUser("ADMIN");
  users.manager = await createUser("MANAGER");
  users.member = await createUser("MEMBER");
  users.outsider = await createUser("OUTSIDER");

  const createResponse = await fetch(
    `${baseUrl}/api/v1/workspaces`,
    {
      method: "POST",
      headers: {
        Origin: env.CLIENT_URL,
        "Content-Type": "application/json",
        Authorization: `Bearer ${users.owner.accessToken}`,
      },
      body: JSON.stringify({
        name: "Original Workspace",
        slug: `update-${randomUUID()}`,
        description: "Original description",
      }),
    }
  );

  assert.equal(createResponse.status, 201);

  const createBody = await createResponse.json();
  workspace = createBody.data.workspace;

  await WorkspaceMember.insertMany([
    {
      workspace: workspace.id,
      user: users.admin.id,
      role: "ADMIN",
    },
    {
      workspace: workspace.id,
      user: users.manager.id,
      role: "MANAGER",
    },
    {
      workspace: workspace.id,
      user: users.member.id,
      role: "MEMBER",
    },
  ]);
});

after(async () => {
  const userRecords = await User.find({
    email: { $in: testEmails },
  }).select("_id");

  const userIds = userRecords.map((user) => user._id);

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

const updateWorkspace = async (accessToken, updates) => {
  return fetch(
    `${baseUrl}/api/v1/workspaces/${workspace.id}`,
    {
      method: "PATCH",
      headers: {
        Origin: env.CLIENT_URL,
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(updates),
    }
  );
};

test("OWNER can update workspace details", async () => {
  const response = await updateWorkspace(
    users.owner.accessToken,
    { name: "Updated by Owner" }
  );

  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.workspace.name, "Updated by Owner");
  assert.equal(body.data.workspace.role, "OWNER");
});

test("ADMIN can update workspace details", async () => {
  const response = await updateWorkspace(
    users.admin.accessToken,
    { description: "Updated by Admin" }
  );

  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(
    body.data.workspace.description,
    "Updated by Admin"
  );
  assert.equal(body.data.workspace.role, "ADMIN");
});

test("MANAGER cannot update workspace details", async () => {
  const response = await updateWorkspace(
    users.manager.accessToken,
    { name: "Unauthorized Manager Update" }
  );

  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
});

test("MEMBER cannot update workspace details", async () => {
  const response = await updateWorkspace(
    users.member.accessToken,
    { name: "Unauthorized Member Update" }
  );

  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
});

test("Non-member cannot update workspace details", async () => {
  const response = await updateWorkspace(
    users.outsider.accessToken,
    { name: "Unauthorized Outsider Update" }
  );

  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
});

test("Workspace update rejects invalid fields such as slug", async () => {
  const response = await updateWorkspace(
    users.owner.accessToken,
    { slug: "changed-slug" }
  );

  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
});

test("Workspace update rejects empty input", async () => {
  const response = await updateWorkspace(
    users.owner.accessToken,
    {}
  );

  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
});

test("Workspace update rejects unauthenticated requests", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/workspaces/${workspace.id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Unauthenticated Update",
      }),
    }
  );

  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.success, false);
});

test("Workspace update rejects invalid workspace IDs", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/workspaces/invalid-id`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${users.owner.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Invalid ID Update",
      }),
    }
  );

  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
});
