
import test from "node:test";
import assert from "node:assert/strict";

import {
  generateCsrfToken,
  verifyCsrfToken,
} from "../../src/utils/csrf-token.js";

const refreshToken = "test-refresh-token-for-csrf";

test("Valid CSRF token is accepted for its refresh token", () => {
  const csrfToken = generateCsrfToken(refreshToken);

  assert.equal(
    verifyCsrfToken(csrfToken, refreshToken),
    true
  );
});

test("CSRF token is rejected for a different refresh token", () => {
  const csrfToken = generateCsrfToken(refreshToken);

  assert.equal(
    verifyCsrfToken(csrfToken, "different-refresh-token"),
    false
  );
});

test("Tampered CSRF token is rejected", () => {
  const csrfToken = generateCsrfToken(refreshToken);
  const tamperedToken = `${csrfToken.slice(0, -1)}X`;

  assert.equal(
    verifyCsrfToken(tamperedToken, refreshToken),
    false
  );
});

test("Malformed CSRF token is rejected", () => {
  assert.equal(
    verifyCsrfToken("invalid-token", refreshToken),
    false
  );
});

test("Expired CSRF token is rejected", () => {
  const originalNow = Date.now;

  try {
    // Generate a token eight days in the past.
    Date.now = () =>
      originalNow() - 8 * 24 * 60 * 60 * 1000;

    const expiredToken = generateCsrfToken(refreshToken);

    // Restore the actual clock before verification.
    Date.now = originalNow;

    assert.equal(
      verifyCsrfToken(expiredToken, refreshToken),
      false
    );
  } finally {
    Date.now = originalNow;
  }
});

test("Missing CSRF token or refresh token is rejected", () => {
  const csrfToken = generateCsrfToken(refreshToken);

  assert.equal(verifyCsrfToken(null, refreshToken), false);
  assert.equal(verifyCsrfToken(csrfToken, null), false);
  assert.equal(verifyCsrfToken("", refreshToken), false);
});
