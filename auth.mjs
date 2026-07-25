// auth.mjs — request-level session/cookie helpers and role guards.
import { getSessionUser } from "./db.mjs";

const COOKIE_NAME = "ndk_session";

export function parseCookies(req) {
  const header = req.headers.cookie || "";
  const out = {};
  header.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

// Returns the authenticated user row, or null.
export function getAuthUser(req) {
  const token = parseCookies(req)[COOKIE_NAME];
  return getSessionUser(token);
}

export function getSessionToken(req) {
  return parseCookies(req)[COOKIE_NAME] || null;
}

export function sessionCookie(token, expiresIso) {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${new Date(expiresIso).toUTCString()}`,
  ];
  // Secure is fine behind Railway/tunnel HTTPS; harmless on localhost over http in most browsers.
  if (process.env.COOKIE_SECURE !== "0") parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function hasRole(user, ...roles) {
  return Boolean(user && roles.includes(user.role));
}

// Superadmin can act on any account; others only on their own.
export function canAccessAccount(user, accountId) {
  if (!user) return false;
  if (user.role === "superadmin") return true;
  return user.account_id === accountId;
}
