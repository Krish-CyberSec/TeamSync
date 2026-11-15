
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

import { env } from "../../src/config/env.js";
import app from "../../src/app.js";

import User from "../../src/modules/users/user.model.js";
import Session from "../../src/modules/auth/session.model.js";

import { createUserSession } from "../../src/modules/auth/auth.service.js";
import { generateAccessToken } from "../../src/utils/token.js";

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
        name: "TeamSync HTTP Logout Test",
        email: `teamsync-http-logout-${randomUUID()}@example.com`,
        passwordHash: "temporary-test-password",
    });

    testUserIds.push(user._id);
    return user;
};

const getMe = async (accessToken) => {
    return fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
};

const logout = async (refreshToken) => {
    return fetch(`${baseUrl}/api/v1/auth/logout`, {
        method: "POST",
        headers: {
            Origin: env.CLIENT_URL,
            Cookie: `refreshToken=${refreshToken}`,
        },
    });
};

const assertCookieCleared = (response) => {
    const cookies = response.headers.getSetCookie();

    const refreshCookie = cookies.find((cookie) =>
        cookie.startsWith("refreshToken=")
    );

    assert.ok(refreshCookie, "Refresh cookie should be present");
    assert.match(refreshCookie, /HttpOnly/i);
    assert.match(refreshCookie, /Path=\/api\/v1\/auth/i);
    assert.match(refreshCookie, /SameSite=Lax/i);
    assert.match(refreshCookie, /Expires=Thu, 01 Jan 1970/i);
};

test("HTTP logout revokes session and clears refresh cookie", async () => {
    const user = await createTestUser();
    const original = await createUserSession(user._id);

    const response = await logout(original.refreshToken);
    const body = await response.json();

    const storedSession = await Session.findById(original.session._id);

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.message, "Logout successful");

    assert.ok(storedSession.revokedAt);
    assertCookieCleared(response);
});

test("HTTP logout immediately invalidates the device access token", async () => {
    const user = await createTestUser();
    const { refreshToken, session } = await createUserSession(user._id);

    const accessToken = generateAccessToken(user._id, session._id);

    const beforeLogout = await getMe(accessToken);
    assert.equal(beforeLogout.status, 200);

    const logoutResponse = await logout(refreshToken);
    assert.equal(logoutResponse.status, 200);

    const afterLogout = await getMe(accessToken);
    const body = await afterLogout.json();

    assert.equal(afterLogout.status, 401);
    assert.equal(body.success, false);
    assert.equal(body.message, "Session is invalid or revoked");
});

test("logging out one device does not invalidate another device", async () => {
    const user = await createTestUser();

    const deviceA = await createUserSession(user._id);
    const deviceB = await createUserSession(user._id);

    const accessTokenA = generateAccessToken(
        user._id,
        deviceA.session._id
    );

    const accessTokenB = generateAccessToken(
        user._id,
        deviceB.session._id
    );

    const deviceABefore = await getMe(accessTokenA);
    const deviceBBefore = await getMe(accessTokenB);

    assert.equal(deviceABefore.status, 200);
    assert.equal(deviceBBefore.status, 200);

    const logoutResponse = await logout(deviceA.refreshToken);
    assert.equal(logoutResponse.status, 200);

    const deviceAAfter = await getMe(accessTokenA);
    const deviceBAfter = await getMe(accessTokenB);

    assert.equal(deviceAAfter.status, 401);
    assert.equal(deviceBAfter.status, 200);

    const sessionA = await Session.findById(deviceA.session._id);
    const sessionB = await Session.findById(deviceB.session._id);

    assert.ok(sessionA.revokedAt);
    assert.equal(sessionB.revokedAt, null);
});

test("HTTP logout succeeds when refresh cookie is missing", async () => {
    const response = await fetch(`${baseUrl}/api/v1/auth/logout`, {
        method: "POST",
        headers: {
            Origin: env.CLIENT_URL,
        },
    });

    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.message, "Logout successful");

    assertCookieCleared(response);
});

test("HTTP logout succeeds with an invalid refresh cookie", async () => {
    const response = await fetch(`${baseUrl}/api/v1/auth/logout`, {
        method: "POST",
        headers: {
            Origin: env.CLIENT_URL,
            Cookie: "refreshToken=invalid-refresh-token",
        },
    });

    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.message, "Logout successful");

    assertCookieCleared(response);
});

test("HTTP logout rejects a request with a malicious Origin", async () => {
    const response = await fetch(`${baseUrl}/api/v1/auth/logout`, {
        method: "POST",
        headers: {
            Origin: "https://malicious.example",
        },
    });

    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.success, false);
    assert.equal(body.message, "Request origin is not allowed");
});

test("HTTP logout rejects a request with a missing Origin", async () => {
    const response = await fetch(`${baseUrl}/api/v1/auth/logout`, {
        method: "POST",
    });

    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.success, false);
    assert.equal(body.message, "Request origin is not allowed");
});
