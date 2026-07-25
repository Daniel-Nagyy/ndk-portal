// push.mjs — Web Push (VAPID) subscription store + sender
import webpush from "web-push";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import dotenv from "dotenv";
dotenv.config();

const STORE_PATH = "push-subscriptions.json";

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@ndk-dispatch.com";

let configured = false;
if (PUBLIC_KEY && PRIVATE_KEY) {
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
  configured = true;
} else {
  console.warn("Web Push disabled: set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env");
}

export function pushConfigured() {
  return configured;
}

export function getVapidPublicKey() {
  return PUBLIC_KEY;
}

function loadSubs() {
  if (!existsSync(STORE_PATH)) return [];
  try {
    const data = JSON.parse(readFileSync(STORE_PATH, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveSubs(subs) {
  try {
    writeFileSync(STORE_PATH, JSON.stringify(subs, null, 2));
  } catch (error) {
    console.warn("Failed to save push subscriptions:", error.message || error);
  }
}

export function addSubscription(sub) {
  if (!sub || !sub.endpoint) return { ok: false, error: "invalid subscription" };
  const subs = loadSubs();
  if (!subs.some((s) => s.endpoint === sub.endpoint)) {
    subs.push(sub);
    saveSubs(subs);
  }
  return { ok: true, count: subs.length };
}

export function removeSubscription(endpoint) {
  const subs = loadSubs().filter((s) => s.endpoint !== endpoint);
  saveSubs(subs);
  return { ok: true, count: subs.length };
}

export function subscriptionCount() {
  return loadSubs().length;
}

// Sends a push to every stored subscription. Prunes dead ones (410/404).
export async function sendPushToAll(payload) {
  if (!configured) return { sent: 0, skipped: "not_configured" };
  const subs = loadSubs();
  if (!subs.length) return { sent: 0, skipped: "no_subscriptions" };

  const body = JSON.stringify(payload);
  const dead = [];
  let sent = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, body);
        sent += 1;
      } catch (error) {
        const status = error?.statusCode;
        if (status === 404 || status === 410) {
          dead.push(sub.endpoint);
        } else {
          console.warn("Push send error:", status || "", error.message || error);
        }
      }
    })
  );

  if (dead.length) {
    saveSubs(subs.filter((s) => !dead.includes(s.endpoint)));
  }
  return { sent, pruned: dead.length };
}
