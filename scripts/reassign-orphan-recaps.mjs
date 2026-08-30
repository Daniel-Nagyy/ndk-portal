// Repoint daily-recap rows whose assignedDispatcherId refers to a user that no
// longer exists (e.g. after an account was deleted and recreated — the recap
// rows survive, but the user ids they reference do not, so the dispatcher view
// filters them out and the rows look "missing").
//
// Dry run by default; pass --apply to write.
//   node scripts/reassign-orphan-recaps.mjs <accountId> <newUserId|unassigned> [--date=YYYY-MM-DD] [--apply]
// Examples:
//   node scripts/reassign-orphan-recaps.mjs triple-j user_4c26d8dfcc4e37f3
//   node scripts/reassign-orphan-recaps.mjs triple-j unassigned --date=2026-08-30 --apply
import { db, getAccount, getRecaps, listUsers, getUserById } from "../db.mjs";

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith("--"));
const [accountId, target] = args.filter((a) => !a.startsWith("--"));
const apply = flags.includes("--apply");
const dateFlag = (flags.find((f) => f.startsWith("--date=")) || "").split("=")[1] || null;

if (!accountId || !target) {
  console.error(`Usage: node scripts/reassign-orphan-recaps.mjs <accountId> <newUserId|unassigned> [--date=YYYY-MM-DD] [--apply]`);
  process.exit(1);
}
if (!getAccount(accountId)) {
  console.error(`No account "${accountId}".`);
  process.exit(1);
}

// "unassigned" (null) is visible to every dispatcher; a user id scopes the rows to them.
let newId = null;
if (target !== "unassigned") {
  if (!getUserById(target)) {
    console.error(`No user "${target}". Users on ${accountId}:`);
    listUsers(accountId).forEach((u) => console.error(`  ${u.id}  ${u.email} (${u.role})`));
    process.exit(1);
  }
  newId = target;
}

const liveUserIds = new Set(listUsers(accountId).map((u) => u.id));
const rows = getRecaps(accountId)
  .filter((r) => !dateFlag || r.dailyDate === dateFlag)
  // Orphans only: null is already visible to everyone, and live ids are intentional.
  .filter((r) => r.assignedDispatcherId && !liveUserIds.has(r.assignedDispatcherId));

if (rows.length === 0) {
  console.log(`No orphaned recap rows found for ${accountId}${dateFlag ? ` on ${dateFlag}` : ""}.`);
  process.exit(0);
}

const byDate = {};
const byOldId = {};
for (const r of rows) {
  byDate[r.dailyDate] = (byDate[r.dailyDate] || 0) + 1;
  byOldId[r.assignedDispatcherId] = (byOldId[r.assignedDispatcherId] || 0) + 1;
}
console.log(`${rows.length} orphaned row(s) in ${accountId}${dateFlag ? ` on ${dateFlag}` : ""}`);
console.log("  by date:", byDate);
console.log("  stale dispatcher ids:", byOldId);
console.log(`  -> ${newId ? `reassign to ${newId}` : "set to unassigned (visible to all dispatchers)"}`);

if (!apply) {
  console.log("\nDry run. Re-run with --apply to write. Back up the DB first:  cp \"$DB_PATH\" \"$DB_PATH.bak\"");
  process.exit(0);
}

const stmt = db.prepare("UPDATE recaps SET payload = ?, updated_at = datetime('now') WHERE id = ?");
const tx = db.transaction((list) => {
  for (const r of list) stmt.run(JSON.stringify({ ...r, assignedDispatcherId: newId }), r.id);
});
tx(rows);
console.log(`\nUpdated ${rows.length} row(s). Reload the Daily Recap page.`);
