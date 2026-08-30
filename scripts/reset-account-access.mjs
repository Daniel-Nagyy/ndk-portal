// Force every user on an account to log out, and optionally set a new password
// for all of them. Run ON the Railway container (railway ssh), where DB_PATH
// points at the production database:
//   node scripts/reset-account-access.mjs <accountIdOrNameFragment> [newPassword]
// Examples:
//   node scripts/reset-account-access.mjs triplej                 # log everyone out
//   node scripts/reset-account-access.mjs triplej 'NDK@triplej2'  # log out + new password
import { db, listAccounts, listUsers, changePassword } from "../db.mjs";

const [target, newPassword] = process.argv.slice(2);
if (!target) {
  console.error("Usage: node scripts/reset-account-access.mjs <accountIdOrNameFragment> [newPassword]");
  process.exit(1);
}

const needle = target.toLowerCase().replace(/[^a-z0-9]/g, "");
const matches = listAccounts().filter((a) =>
  `${a.id} ${a.name}`.toLowerCase().replace(/[^a-z0-9]/g, "").includes(needle)
);

if (matches.length === 0) {
  console.error(`No account matched "${target}". Accounts: ${listAccounts().map((a) => a.id).join(", ") || "(none)"}`);
  process.exit(1);
}
if (matches.length > 1) {
  console.error(`"${target}" matched several accounts: ${matches.map((a) => a.id).join(", ")}`);
  process.exit(1);
}

const account = matches[0];
const users = listUsers(account.id);
if (users.length === 0) {
  console.error(`Account ${account.id} has no users.`);
  process.exit(1);
}

let killed = 0;
for (const u of users) {
  killed += db.prepare("DELETE FROM sessions WHERE user_id = ?").run(u.id).changes;
  if (newPassword) changePassword(u.id, newPassword);
}

console.log(`${account.name} (${account.id}): ${killed} session(s) revoked across ${users.length} user(s).`);
for (const u of users) console.log(`  - ${u.email} (${u.role})${newPassword ? " — password changed" : ""}`);
if (!newPassword) console.log("No password given, so existing passwords are unchanged.");
