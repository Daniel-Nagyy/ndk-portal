// Inspect, set, clear or test an account's Telegram chat IDs. Run ON the Railway
// container (railway ssh), where DB_PATH points at the production database.
//
//   node scripts/telegram-chat.mjs status
//   node scripts/telegram-chat.mjs set   <accountId> <main|focus> <chatId>
//   node scripts/telegram-chat.mjs clear <accountId> <main|focus>
//   node scripts/telegram-chat.mjs test  <accountId> <main|focus>
//
// "main"  = the group that gets every alert (HOS + all Netradyne).
// "focus" = the quieter second group: roadside parking, distraction, drowsiness,
//           and any HOS clock at 20 minutes left. Same bot as the main group.
//
// "test" sends a real message so you can confirm the bot is actually in the group.
import { listAccounts, getAccount, getAccountCredentials, updateAccount } from "../db.mjs";
import { sendTelegramToAccount } from "../notify.mjs";

const [cmd, accountId, which, chatId] = process.argv.slice(2);
const TARGETS = ["main", "focus"];

function usage(msg) {
  if (msg) console.error(`Error: ${msg}\n`);
  console.error(`Usage:
  node scripts/telegram-chat.mjs status
  node scripts/telegram-chat.mjs set   <accountId> <main|focus> <chatId>
  node scripts/telegram-chat.mjs clear <accountId> <main|focus>
  node scripts/telegram-chat.mjs test  <accountId> <main|focus>

Accounts: ${listAccounts().map((a) => a.id).join(", ") || "(none)"}`);
  process.exit(1);
}

function status() {
  for (const a of listAccounts()) {
    const c = getAccountCredentials(a.id);
    const bot = c.telegram.botToken
      ? "account bot"
      : (process.env.TELEGRAM_BOT_TOKEN ? "global env bot" : "NONE — nothing will send");
    console.log(`\n${a.name} (${a.id})`);
    console.log(`   bot     ${bot}`);
    console.log(`   main    ${c.telegram.chatId || "- (falls back to TELEGRAM_CHAT_ID)"}`);
    console.log(`   focus   ${c.telegram.focusChatId || "- (no focus group; those alerts go to main only)"}`);
  }
  console.log("\nBot tokens are never printed.");
}

function requireAccount() {
  if (!accountId) usage("missing <accountId>");
  const account = getAccount(accountId);
  if (!account) usage(`no account with id "${accountId}"`);
  return account;
}

function requireTarget() {
  if (!which || !TARGETS.includes(which)) usage(`second argument must be one of: ${TARGETS.join(", ")}`);
  return which === "focus" ? "telegramFocusChatId" : "telegramChatId";
}

if (!cmd || cmd === "status") { status(); process.exit(0); }

if (cmd === "set") {
  const account = requireAccount();
  const field = requireTarget();
  if (!chatId) usage("set needs <chatId> (e.g. -1001234567890)");
  if (!/^-?\d+$/.test(chatId)) usage(`"${chatId}" is not a Telegram chat id (digits, usually negative for groups)`);

  const before = getAccountCredentials(accountId);
  updateAccount(accountId, { [field]: chatId });
  const after = getAccountCredentials(accountId);
  const prev = which === "focus" ? before.telegram.focusChatId : before.telegram.chatId;
  const now = which === "focus" ? after.telegram.focusChatId : after.telegram.chatId;

  console.log(`${which} chat for ${account.name} (${accountId}): ${prev || "(unset)"} -> ${now}`);
  if (!after.telegram.botToken && !process.env.TELEGRAM_BOT_TOKEN) {
    console.log("WARNING: this account has no Telegram bot token and none is set in the env — nothing will send.");
  }
  console.log(`Confirm the bot can post there: node scripts/telegram-chat.mjs test ${accountId} ${which}`);
  process.exit(0);
}

if (cmd === "clear") {
  const account = requireAccount();
  const field = requireTarget();
  updateAccount(accountId, { [field]: "" });
  console.log(`${which} chat cleared for ${account.name} (${accountId}).`);
  if (which === "focus") console.log("Focus-only alerts now go to the main chat only.");
  process.exit(0);
}

if (cmd === "test") {
  const account = requireAccount();
  requireTarget();
  const focus = which === "focus";
  const when = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  const text = [
    focus ? "Focus group test" : "Main group test",
    `Account: ${account.name}`,
    `Sent: ${when}`,
    focus
      ? "If you can read this, roadside parking / distraction / drowsiness alerts and 20-minute HOS alerts will land here."
      : "If you can read this, HOS and all Netradyne alerts will land here.",
  ].join("\n");

  const result = await sendTelegramToAccount(accountId, text, { focus });
  if (result.ok) {
    console.log(`Sent to the ${which} group for ${account.name}. Check Telegram.`);
    process.exit(0);
  }
  console.error(`Not sent: ${result.skipped || result.error}`);
  if (result.skipped === "no_focus_chat") console.error("Set one first with: set <accountId> focus <chatId>");
  if (result.skipped === "not_configured") console.error("The account has no main chat id and/or no bot token.");
  process.exit(1);
}

usage(`unknown command "${cmd}"`);
