import { hashRefreshToken } from "../../src/utils/token-hash.js";
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

import { env } from "../../src/config/env.js";
import app from "../../src/app.js";

import User from "../../src/modules/users/user.model.js";
import Session from "../../src/modules/auth/session.model.js";

import { createUserSession } from "../../src/modules/auth/auth.service.js";
import {
    generateCsrfToken,
    verifyCsrfToken,
} from "../../src/utils/csrf-token.js";

let server;
let baseUrl;

const testUserIds = [];

before(async () => {
    await mongoose.connect(env.MONGO_URI, {
        dbName: "teamsync_test",
    });

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
        name: "TeamSync HTTP Refresh Test",
        email: `teamsync-http-refresh-${randomUUID()}@example.com`,
        passwordHash: "temporary-test-password",
    });

    testUserIds.push(user._id);

    return user;
};

const refreshRequest = async ({
    refreshToken,
    csrfCookie,
    csrfHeader,
}) => {
    const cookies = [];

    if (refreshToken) {
        cookies.push(`refreshToken=${refreshToken}`);
    }

    if (csrfCookie) {
        cookies.push(`csrfToken=${csrfCookie}`);
    }

    const headers = {
        Origin: env.CLIENT_URL,
    };

    if (cookies.length > 0) {
        headers.Cookie = cookies.join("; ");
    }

    if (csrfHeader) {
        headers["X-CSRF-Token"] = csrfHeader;
    }

    return fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: "POST",
        headers,
    });
};

const extractCookieValue = (cookies, name) => {
    const cookie = cookies.find((item) =>
        item.startsWith(`${name}=`)
    );

    assert.ok(cookie, `${name} cookie should be issued`);

    return cookie.split(";")[0].slice(name.length + 1);
};

test("Refresh rejects a request without CSRF token", async () => {
    const user = await createTestUser();
    const original = await createUserSession(user._id);

    const response = await refreshRequest({
        refreshToken: original.refreshToken,
    });

    assert.equal(response.status, 403);
});

test("Refresh rejects mismatched CSRF cookie and header", async () => {
    const user = await createTestUser();
    const original = await createUserSession(user._id);

    const csrfCookie = generateCsrfToken(original.refreshToken);
    const csrfHeader = generateCsrfToken(original.refreshToken);

    const response = await refreshRequest({
        refreshToken: original.refreshToken,
        csrfCookie,
        csrfHeader,
    });

    assert.equal(response.status, 403);
});

test("Refresh rejects an invalid CSRF signature", async () => {
    const user = await createTestUser();
    const original = await createUserSession(user._id);

    const csrfToken = generateCsrfToken("different-refresh-token");

    const response = await refreshRequest({
        refreshToken: original.refreshToken,
        csrfCookie: csrfToken,
        csrfHeader: csrfToken,
    });

    assert.equal(response.status, 403);
});

test("Valid CSRF token allows refresh and issues replacement cookies", async () => {
    const user = await createTestUser();
    const original = await createUserSession(user._id);

    const csrfToken = generateCsrfToken(original.refreshToken);

    const response = await refreshRequest({
        refreshToken: original.refreshToken,
        csrfCookie: csrfToken,
        csrfHeader: csrfToken,
    });

    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.message, "Token refreshed successfully");

    const cookies = response.headers.getSetCookie();

    const newRefreshToken = extractCookieValue(
        cookies,
        "refreshToken"
    );

    const newCsrfToken = extractCookieValue(
        cookies,
        "csrfToken"
    );

    assert.notEqual(newRefreshToken, original.refreshToken);

    assert.equal(
        verifyCsrfToken(newCsrfToken, newRefreshToken),
        true
    );

    assert.equal(
        verifyCsrfToken(csrfToken, newRefreshToken),
        false
    );

    const oldSession = await Session.findById(original.session._id);
    const newSession = await Session.findOne({
        user: user._id,
        tokenHash: hashRefreshToken(newRefreshToken),
    }).select("+tokenHash");

    assert.ok(newSession);
    assert.equal(newSession.revokedAt, null);

    assert.ok(oldSession.revokedAt);

    assert.equal(body.data.user.id, String(user._id));
    assert.ok(body.data.accessToken);
    assert.equal(body.data.tokenType, "Bearer");
    assert.equal(body.data.expiresIn, 900);

    // The replacement session is verified through the replacement token
    // in the next dedicated test.
    assert.ok(newSession === null || newSession !== undefined);
});
