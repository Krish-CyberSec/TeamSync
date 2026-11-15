
import test, { before, after } from "node:test";
import assert from "node:assert/strict";

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

test("General API limiter blocks the 301st request", async () => {
  for (let i = 1; i <= 300; i++) {
    const response = await fetch(
      `${baseUrl}/api/v1/rate-limit-test`
    );

    assert.equal(
      response.status,
      404,
      `Request ${i} should reach the application`
    );
  }

  const response = await fetch(
    `${baseUrl}/api/v1/rate-limit-test`
  );

  const body = await response.json();

  assert.equal(response.status, 429);
  assert.equal(body.success, false);
  assert.equal(
    body.message,
    "Too many requests. Please try again later."
  );
});
