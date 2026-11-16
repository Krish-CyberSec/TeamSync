
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
      name: `Deletion ${role}`,
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
        name: "Deletion Test Workspace",
        slug: `deletion-${randomUUID()}`,
        description: "Workspace deletion integration test",
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
  const records = await User.find({
    email: { $in: testEmails },
  }).select("_id");

  const userIds = records.map((user) => user._id);

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

const deleteWorkspaceRequest = async (accessToken) => {
  return fetch(
    `${baseUrl}/api/v1/workspaces/${workspace.id}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
};

test("ADMIN cannot delete workspace", async () => {
  const response = await deleteWorkspaceRequest(
    users.admin.accessToken
  );

  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
});

test("MANAGER cannot delete workspace", async () => {
  const response = await deleteWorkspaceRequest(
    users.manager.accessToken
  );

  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
});

test("MEMBER cannot delete workspace", async () => {
  const response = await deleteWorkspaceRequest(
    users.member.accessToken
  );

  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
});

test("Non-member cannot delete workspace", async () => {
  const response = await deleteWorkspaceRequest(
    users.outsider.accessToken
  );

  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
});

test("Unauthenticated request cannot delete workspace", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/workspaces/${workspace.id}`,
    {
      method: "DELETE",
    }
  );

  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.success, false);
});

test("Invalid workspace ID is rejected", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/workspaces/invalid-id`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${users.owner.accessToken}`,
      },
    }
  );

  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
});

test("OWNER can soft-delete workspace", async () => {
  const response = await deleteWorkspaceRequest(
    users.owner.accessToken
  );

  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  const deletedWorkspace = await Workspace.findById(
    workspace.id
  );

  assert.ok(deletedWorkspace);
  assert.equal(deletedWorkspace.status, "DELETED");
  assert.ok(deletedWorkspace.deletedAt);
});

test("Deleted workspace does not appear in workspace listing", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/workspaces`,
    {
      headers: {
        Authorization: `Bearer ${users.owner.accessToken}`,
      },
    }
  );

  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  assert.equal(
    body.data.workspaces.some(
      (item) => item.id.toString() === workspace.id
    ),
    false
  );
});

test("Deleted workspace details are inaccessible", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/workspaces/${workspace.id}`,
    {
      headers: {
        Authorization: `Bearer ${users.owner.accessToken}`,
      },
    }
  );

  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
});

test("Deleted workspace cannot be updated", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/workspaces/${workspace.id}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${users.owner.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Attempted Update After Deletion",
      }),
    }
  );

  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
});

test("Deleted workspace cannot be deleted again", async () => {
  const response = await deleteWorkspaceRequest(
    users.owner.accessToken
  );

  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
});
