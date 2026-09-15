// Walk the whole Netradyne notification chain for one account and report the
// first broken link. Read-only: it never sends a notification or a Telegram
// message (it uses getMe/getChat, which only read).
//   node scripts/diagnose-netradyne.mjs [accountId]
import {
  listAccounts, getAccount, getAccountCredentials, getSubscriptionsForAccount,
  getAuthFailure, AUTH_FAIL_LIMIT,
} from "../db.mjs";

const accountId = process.argv[2] || null;
const accounts = accountId ? [getAccount(accountId)].filter(Boolean) : listAccounts();
if (!accounts.length) {
  console.error(accountId ? `No account "${accountId}".` : "No accounts.");
  process.exit(1);
}

const problems = [];
const ok = (m) => console.log(`  ok    ${m}`);
const bad = (m) => { console.log(`  FAIL  ${m}`); problems.push(m); };
const warn = (m) => console.log(`  warn  ${m}`);

// Global kill switch first — it disables polling for every account at once.
console.log(`NETRADYNE_ENABLED=${process.env.NETRADYNE_ENABLED ?? "(unset, enabled)"}`);
if (process.env.NETRADYNE_ENABLED === "0") {
  console.log("\nPolling is globally disabled. Nothing else matters until that is unset.");
  process.exit(1);
}
console.log(`Alert freshness window: ${Number(process.env.NETRADYNE_ALERT_FRESH_MS) || 20 * 60 * 1000}ms`);
console.log(`VAPID keys: ${process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY ? "set" : "MISSING (web push disabled)"}`);

for (const a of accounts) {
  console.log(`\n=== ${a.name} (${a.id}) ===`);
  const c = getAccountCredentials(a.id);

  // 1. Credentials present?
  if (c.netradyne.email && c.netradyne.password) ok(`Netradyne credentials set (${c.netradyne.email})`);
  else bad("no Netradyne credentials — this account is never polled");

  // 2. Blocked by the login circuit breaker?
  const fail = getAuthFailure("netradyne", a.id);
  if (!fail) ok("no recorded login failures");
  else if (fail.fail_count >= AUTH_FAIL_LIMIT) {
    bad(`login BLOCKED after ${fail.fail_count} rejected attempt(s) at ${fail.last_failed_at}: ${fail.last_error}`);
    console.log(`        fix: node scripts/provider-creds.mjs set ${a.id} netradyne '<password>'`);
  } else warn(`${fail.fail_count}/${AUTH_FAIL_LIMIT} recent login failures: ${fail.last_error}`);

  // 3. Delivery channels. Either one alone is enough to get notified.
  const subs = getSubscriptionsForAccount(a.id);
  if (subs.length) ok(`${subs.length} web-push subscriber(s)`);
  else warn("no web-push subscribers (nobody has enabled notifications in the browser)");

  const botToken = c.telegram.botToken || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = c.telegram.chatId || process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    warn("Telegram not configured for this account");
  } else {
    // getMe validates the token; getChat validates the chat id and that the bot
    // is still a member. Neither posts anything.
    try {
      const me = await fetch(`https://api.telegram.org/bot${botToken}/getMe`).then((r) => r.json());
      if (!me.ok) bad(`Telegram bot token rejected: ${me.description}`);
      else {
        ok(`Telegram bot @${me.result.username}`);
        const chat = await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=${encodeURIComponent(chatId)}`).then((r) => r.json());
        if (chat.ok) ok(`Telegram chat ${chatId} reachable (${chat.result.title || chat.result.type})`);
        else bad(`Telegram chat ${chatId} unreachable: ${chat.description} — bot removed from the group, or wrong chat id`);
      }
    } catch (e) {
      bad(`Telegram check failed: ${e.message}`);
    }
  }

  if (!subs.length && (!botToken || !chatId)) bad("no delivery channel at all — alerts are scraped but go nowhere");
}

console.log(problems.length ? `\n${problems.length} problem(s) found.` : "\nNo problems found in the stored config.");
console.log("Live poll state (login ok, last error, last scrape) is only in the running process:");
console.log("  curl -s localhost:${PORT:-3000}/api/netradyne/status  # needs a superadmin session cookie");
console.log("or check the deploy logs for lines like '[mgi-transportation] poll failed:'.");
