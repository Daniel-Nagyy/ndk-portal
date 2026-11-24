// notify.mjs — account-aware alert routing (Web Push + Telegram).
import webpush from "web-push";
import dotenv from "dotenv";
import {
  getAccountCredentials, getSubscriptionsForAccount, deleteSubscriptionByEndpoint, recordAlert,
} from "./db.mjs";
import { MUTED_KINDS } from "./alert-kinds.mjs";
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
  // Urgency:high tells APNs/FCM to deliver immediately instead of batching to
  // save battery — critical alerts were arriving minutes late without this.
  // Urgency:high = deliver now (not battery-batched). TTL: hold a critical alert
  // up to 1h if the phone is briefly offline so it isn't dropped/missed.
  const options = { urgency: payload.critical ? "high" : "normal", TTL: payload.critical ? 3600 : 600 };
  let sent = 0;
  let pruned = 0;
  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(sub, body, options);
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
// `focus: true` targets the account's optional second (focus) group instead of
// its main chat, using the same bot. If no focus chat is set the message is
// skipped rather than falling back — the main chat already received a copy.
export async function sendTelegramToAccount(accountId, text, { focus = false } = {}) {
  const creds = accountId ? getAccountCredentials(accountId) : null;
  const botToken = (creds?.telegram?.botToken) || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = focus
    ? ((creds?.telegram?.focusChatId) || process.env.TELEGRAM_FOCUS_CHAT_ID || "")
    : ((creds?.telegram?.chatId) || process.env.TELEGRAM_CHAT_ID);
  if (!botToken || !chatId) {
    const why = !botToken ? "no_bot_token" : (focus ? "no_focus_chat" : "not_configured");
    return { ok: false, skipped: why, focus };
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  if (!response.ok) {
    const b = await response.text().catch(() => "");
    let description = b.slice(0, 200);
    try { description = JSON.parse(b).description || description; } catch (_) {}
    console.warn(`Telegram error ${response.status} (${focus ? "focus" : "main"} chat ${chatId}): ${description}`);
    return { ok: false, error: `telegram_${response.status}`, description, chatId, focus };
  }
  return { ok: true, chatId, focus };
}

// Send an alert to an account through both channels.
// `telegramFocus: true` additionally copies the message to the account's focus
// group (see sendTelegramToAccount) — it never replaces the main chat.
// Every alert in the system goes out through here, which makes it the one
// place that can record them. The superadmin board reads that record: before
// it existed an alert was sent and then gone, so there was nothing to show.
//
// `kind` groups alerts on the board (hos-risk, tour-stopped, bobtail...) and
// `severity` colours them. They default to something harmless so a caller that
// has not been updated still files a usable row rather than throwing.
//
// Recording must never stop an alert going out: a board that misses a row is a
// nuisance, an alert that never reaches a dispatcher is the actual failure.
export async function notifyAccount(accountId, { title, body, tag, requireInteraction = false, critical = false, url = "/index.html", telegramText, push = true, telegramFocus = false, kind = "other", severity, meta = null }) {
  const message = telegramText || `${title}\n${body}`;

  // Muted kinds are never shown on the board, so there is nothing to gain by
  // storing them. Duty-status changes alone are a few hundred rows a day that
  // no one ever reads. They still go out over Telegram exactly as before -
  // this drops the row, not the alert.
  let recorded = null;
  if (!MUTED_KINDS.includes(kind)) {
    try {
      recorded = recordAlert({
        accountId,
        kind,
        severity: severity || (critical ? "critical" : "info"),
        title,
        body,
        dedupeKey: tag,
        meta: { ...(meta || {}), focus: Boolean(telegramFocus) },
      });
    } catch (error) {
      console.warn("Alert not recorded:", error.message || error);
    }
  }

  const [pushRes, tg, focusTg] = await Promise.allSettled([
    push
      ? sendPushToAccount(accountId, { title, body, tag, requireInteraction: requireInteraction || critical, critical, url })
      : Promise.resolve({ sent: 0, skipped: "push_disabled" }),
    sendTelegramToAccount(accountId, message),
    telegramFocus
      ? sendTelegramToAccount(accountId, message, { focus: true })
      : Promise.resolve({ ok: false, skipped: "not_focus_alert" }),
  ]);
  return {
    alertId: recorded ? recorded.id : null,
    push: pushRes.status === "fulfilled" ? pushRes.value : { error: String(pushRes.reason) },
    telegram: tg.status === "fulfilled" ? tg.value : { error: String(tg.reason) },
    telegramFocus: focusTg.status === "fulfilled" ? focusTg.value : { error: String(focusTg.reason) },
  };
}
