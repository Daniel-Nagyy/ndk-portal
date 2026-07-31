// Delete every account EXCEPT the one you name (default: mgi-transportation). Also removes
// each deleted account's users, sessions, and push subscriptions. Irreversible.
// Local:   node scripts/keep-only.mjs mgi-transportation
// Railway: railway ssh  →  node scripts/keep-only.mjs mgi-transportation
import { listAccounts, deleteAccount } from "../db.mjs";

const KEEP = process.argv[2] || "mgi-transportation";
const all = listAccounts();
if (!all.some((a) => a.id === KEEP)) {
  console.error(`Account to keep ("${KEEP}") not found. Existing: ${all.map((a) => a.id).join(", ")}`);
  process.exit(1);
}
for (const a of all) {
  if (a.id === KEEP) { console.log(`KEEP   ${a.name} (${a.id})`); continue; }
  const r = deleteAccount(a.id);
  console.log(`DELETE ${a.name} (${a.id}) — removed ${r.deletedUsers} user(s)`);
}
console.log("Done.");
