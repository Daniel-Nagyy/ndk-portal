// notify.mjs — account-aware alert routing (Web Push + Telegram).
import webpush from "web-push";
import dotenv from "dotenv";
import { getAccountCredentials, getSubscriptionsForAccount, deleteSubscriptionByEndpoint } from "./db.mjs";
dotenv.config();

// Ensure VAPID is configured (idempotent; push.mjs may have set it already).
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:admin@ndk-dispatch.com",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  } catch (_) {}
}

// Push to every device subscribed under an account. Prunes dead endpoints.
export async function sendPushToAccount(accountId, payload) {
  const subs = getSubscriptionsForAccount(accountId);
  if (!subs.length) return { sent: 0, skipped: "no_subscriptions" };
  const body = JSON.stringify(payload);
  let sent = 0;
  let pruned = 0;
  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(sub, body);
      sent += 1;
    } catch (error) {
      const status = error?.statusCode;
      if (status === 404 || status === 410) {
        deleteSubscriptionByEndpoint(sub.endpoint);
        pruned += 1;
      } else {
        console.warn("Push error:", status || "", error.message || error);
      }
    }
  }));
  return { sent, pruned };
}

// Telegram to an account's own bot/chat, else the global env bot/chat.
export async function sendTelegramToAccount(accountId, text) {
  const creds = accountId ? getAccountCredentials(accountId) : null;
  const botToken = (creds?.telegram?.botToken) || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = (creds?.telegram?.chatId) || process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return { ok: false, skipped: "not_configured" };

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  if (!response.ok) {
    const b = await response.text().catch(() => "");
    console.warn(`Telegram error ${response.status}: ${b.slice(0, 160)}`);
    return { ok: false, error: `telegram_${response.status}` };
  }
  return { ok: true };
}

// Send an alert to an account through both channels.
export async function notifyAccount(accountId, { title, body, tag, requireInteraction = false, url = "/index.html", telegramText }) {
  const [push, tg] = await Promise.allSettled([
    sendPushToAccount(accountId, { title, body, tag, requireInteraction, url }),
    sendTelegramToAccount(accountId, telegramText || `${title}\n${body}`),
  ]);
  return {
    push: push.status === "fulfilled" ? push.value : { error: String(push.reason) },
    telegram: tg.status === "fulfilled" ? tg.value : { error: String(tg.reason) },
  };
}
