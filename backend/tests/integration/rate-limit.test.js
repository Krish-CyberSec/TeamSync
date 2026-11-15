
import test, { before, after } from "node:test";
import assert from "node:assert/strict";

import { env } from "../../src/config/env.js";
import app from "../../src/app.js";

let server;
let baseUrl;

before(async () => {
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
});

const sendRequest = async (endpoint, body = {}) => {
  return fetch(`${baseUrl}/api/v1/auth/${endpoint}`, {
    method: "POST",
    headers: {
      Origin: env.CLIENT_URL,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
};

test("Login limiter blocks the sixth request", async () => {
  for (let i = 1; i <= 5; i++) {
    const response = await sendRequest("login");
    assert.notEqual(response.status, 429);
  }

  const sixthResponse = await sendRequest("login");

  assert.equal(sixthResponse.status, 429);

  const body = await sixthResponse.json();

  assert.equal(body.success, false);
  assert.equal(
    body.message,
    "Too many login attempts. Please try again later."
  );
});

test("Registration limiter blocks the sixth request", async () => {
  for (let i = 1; i <= 5; i++) {
    const response = await sendRequest("register");
    assert.notEqual(response.status, 429);
  }

  const sixthResponse = await sendRequest("register");

  assert.equal(sixthResponse.status, 429);

  const body = await sixthResponse.json();

  assert.equal(body.success, false);
  assert.equal(
    body.message,
    "Too many registration attempts. Please try again later."
  );
});

test("Refresh limiter blocks the thirty-first request", async () => {
  for (let i = 1; i <= 30; i++) {
    const response = await sendRequest("refresh");
    assert.notEqual(response.status, 429);
  }

  const thirtyFirstResponse = await sendRequest("refresh");

  assert.equal(thirtyFirstResponse.status, 429);

  const body = await thirtyFirstResponse.json();

  assert.equal(body.success, false);
  assert.equal(
    body.message,
    "Too many refresh requests. Please try again later."
  );
});
