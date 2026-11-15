
import crypto from "node:crypto";
import { env } from "../config/env.js";

const TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

const createSignature = (timestamp, nonce, refreshToken) => {
  return crypto
    .createHmac("sha256", env.CSRF_SECRET)
    .update(`${timestamp}.${nonce}.${refreshToken}`)
    .digest("base64url");
};

export const generateCsrfToken = (refreshToken) => {
  if (typeof refreshToken !== "string" || !refreshToken) {
    throw new Error("A valid refresh token is required");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomBytes(32).toString("base64url");

  const signature = createSignature(
    timestamp,
    nonce,
    refreshToken
  );

  return `${timestamp}.${nonce}.${signature}`;
};

export const verifyCsrfToken = (csrfToken, refreshToken) => {
  if (
    typeof csrfToken !== "string" ||
    typeof refreshToken !== "string" ||
    !csrfToken ||
    !refreshToken
  ) {
    return false;
  }

  const parts = csrfToken.split(".");

  if (parts.length !== 3) {
    return false;
  }

  const [timestampString, nonce, receivedSignature] = parts;

  if (!/^\d+$/.test(timestampString)) {
    return false;
  }

  if (!/^[A-Za-z0-9_-]{43}$/.test(nonce)) {
    return false;
  }

  if (!/^[A-Za-z0-9_-]{43}$/.test(receivedSignature)) {
    return false;
  }

  const timestamp = Number(timestampString);
  const now = Math.floor(Date.now() / 1000);

  if (
    !Number.isSafeInteger(timestamp) ||
    timestamp > now ||
    now - timestamp > TOKEN_MAX_AGE_SECONDS
  ) {
    return false;
  }

  const expectedSignature = createSignature(
    timestampString,
    nonce,
    refreshToken
  );

  const expectedBuffer = Buffer.from(expectedSignature, "base64url");
  const receivedBuffer = Buffer.from(receivedSignature, "base64url");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    expectedBuffer,
    receivedBuffer
  );
};
