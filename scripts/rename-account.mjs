// scripts/rename-account.mjs - change an account's id and/or display name,
// everywhere the id is stored.
//
//   node scripts/rename-account.mjs                      # dry run, auto-detect
//   node scripts/rename-account.mjs --apply              # do it
//   node scripts/rename-account.mjs --id legendary --name Legendary --apply
//   node scripts/rename-account.mjs --from legenday-legacy --id legendary --apply
//
// The account id is not just the accounts row. It is a foreign key in six
// tables, a client_id in three more, it is EMBEDDED IN THE RECAP PAYLOAD JSON,
// it keys the Netradyne auth-failure record, and it names the Netradyne browser
// profile directory and the Driver Slots seed file. Missing any one of those
// orphans data silently, so this script does all of them in one transaction and
// verifies every foreign key before committing.
//
// Safe to re-run: if the new id already exists and the old one is gone, it
// reports that there is nothing to do and exits 0.
import { existsSync, renameSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "../db.mjs";

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf("--" + name);
  return i === -1 ? null : (argv[i + 1] ?? "");
};
const APPLY = argv.includes("--apply");
const NEW_ID = flag("id") || "legendary";
const NEW_NAME = flag("name") || "Legendary";
let FROM = flag("from");

// account_id columns, then the client_id columns (recaps and friends).
const ACCOUNT_ID_TABLES = ["users", "push_subscriptions", "down_trucks", "scorecards", "drivers", "driver_shifts"];
const CLIENT_ID_TABLES = ["recaps", "netradyne_recaps", "disputes"];

const say = (...a) => console.log(...a);
const die = (m) => { console.error("\n  " + m + "\n"); process.exit(1); };

// --- find the account -------------------------------------------------------
const accounts = db.prepare("SELECT id, name FROM accounts ORDER BY id").all();
const idList = accounts.map((a) => a.id).join(", ") || "(none)";

if (!FROM) {
  const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const hits = accounts.filter((a) => norm(a.id).includes("legend") || norm(a.name).includes("legend"));
  if (hits.length > 1) die('more than one account looks like Legendary: ' + hits.map((h) => h.id).join(", ") + " - pass --from <id>");
  if (!hits.length) {
    if (accounts.some((a) => a.id === NEW_ID)) {
      say('Account "' + NEW_ID + '" already exists and no old id is left. Nothing to do.');
      process.exit(0);
    }
    die('no account matching "legend" on this deployment. Accounts: ' + idList + " - pass --from <id>");
  }
  FROM = hits[0].id;
}

const before = accounts.find((a) => a.id === FROM);
if (!before) die('no account with id "' + FROM + '". Accounts: ' + idList);

const idChanges = FROM !== NEW_ID;
if (idChanges && accounts.some((a) => a.id === NEW_ID)) {
  die('an account with id "' + NEW_ID + '" already exists - refusing to merge two accounts');
}

say("");
say('Account: "' + before.name + '"  (id: ' + before.id + ")");
say('     ->  "' + NEW_NAME + '"  (id: ' + NEW_ID + ")" + (idChanges ? "" : "   [id unchanged]"));

// --- what will move ---------------------------------------------------------
const counts = {};
for (const t of ACCOUNT_ID_TABLES) counts[t] = db.prepare("SELECT COUNT(*) n FROM " + t + " WHERE account_id = ?").get(FROM).n;
for (const t of CLIENT_ID_TABLES) counts[t] = db.prepare("SELECT COUNT(*) n FROM " + t + " WHERE client_id = ?").get(FROM).n;
counts.auth_failures = db.prepare("SELECT COUNT(*) n FROM auth_failures WHERE ref = ?").get(FROM).n;

say("");
say("Rows carrying this id:");
let total = 0;
for (const [t, n] of Object.entries(counts)) {
  total += n;
  if (n) say("  " + String(n).padStart(6) + "  " + t);
}
if (!total) say("       0  (none - only the accounts row itself)");

const profileDir = join(process.cwd(), "netradyne-browser-data", FROM);
const newProfileDir = join(process.cwd(), "netradyne-browser-data", NEW_ID);
const seedFile = join(process.cwd(), "data", "driver-shifts", FROM + ".json");
const hasProfile = idChanges && existsSync(profileDir);
const hasSeed = idChanges && existsSync(seedFile);
if (hasProfile) say("\nNetradyne session directory will be moved (keeps you signed in):\n  " + profileDir);
if (hasSeed) say("\nDriver Slots seed will be rewritten with the new accountId:\n  " + seedFile);

if (!APPLY) {
  say("\nDRY RUN - nothing was changed. Re-run with --apply to commit.\n");
  process.exit(0);
}

// --- do it ------------------------------------------------------------------
// users.account_id is ON UPDATE NO ACTION, so the parent id cannot move while
// enforcement is on. Enforcement is disabled for the transaction and the whole
// database is re-checked before the result is kept.
db.pragma("foreign_keys = OFF");
try {
  db.transaction(() => {
    db.prepare("UPDATE accounts SET name = ? WHERE id = ?").run(NEW_NAME, FROM);

    if (idChanges) {
      db.prepare("UPDATE accounts SET id = ? WHERE id = ?").run(NEW_ID, FROM);
      for (const t of ACCOUNT_ID_TABLES) {
        db.prepare("UPDATE " + t + " SET account_id = ? WHERE account_id = ?").run(NEW_ID, FROM);
      }

      // The client_id column AND the clientId inside the stored payload JSON.
      // The payload is what the UI reads back, so a column-only update leaves
      // every recap row still claiming the old account.
      for (const t of CLIENT_ID_TABLES) {
        const rows = db.prepare("SELECT id, payload FROM " + t + " WHERE client_id = ?").all(FROM);
        const upd = db.prepare("UPDATE " + t + " SET client_id = ?, payload = ? WHERE id = ?");
        for (const r of rows) {
          let payload = r.payload;
          try {
            const o = JSON.parse(r.payload);
            if (o && typeof o === "object") {
              o.clientId = NEW_ID;
              payload = JSON.stringify(o);
            }
          } catch {
            // leave an unparseable payload byte-for-byte alone
          }
          upd.run(NEW_ID, payload, r.id);
        }
      }

      // Netradyne's login breaker is keyed on the account id. Geotab's is keyed
      // on database + username, so it is deliberately untouched - moving it
      // would reset a block that exists for a reason.
      for (const r of db.prepare("SELECT id, provider FROM auth_failures WHERE ref = ?").all(FROM)) {
        db.prepare("UPDATE auth_failures SET id = ?, ref = ? WHERE id = ?")
          .run(r.provider + ":" + NEW_ID, NEW_ID, r.id);
      }
    }

    const broken = db.pragma("foreign_key_check");
    if (broken.length) throw new Error("foreign keys broken, rolling back: " + JSON.stringify(broken.slice(0, 5)));
  })();
} finally {
  db.pragma("foreign_keys = ON");
}

if (hasProfile && !existsSync(newProfileDir)) {
  renameSync(profileDir, newProfileDir);
  say("moved Netradyne session directory -> netradyne-browser-data/" + NEW_ID);
}
if (hasSeed) {
  const target = join(process.cwd(), "data", "driver-shifts", NEW_ID + ".json");
  try {
    const o = JSON.parse(readFileSync(seedFile, "utf8"));
    o.accountId = NEW_ID;
    writeFileSync(target, JSON.stringify(o, null, 2));
    if (target !== seedFile) renameSync(seedFile, seedFile + ".renamed");
    say("rewrote Driver Slots seed -> data/driver-shifts/" + NEW_ID + ".json");
  } catch (e) {
    say("WARNING: could not rewrite the seed file (" + e.message + ") - fix data/driver-shifts/ by hand");
  }
}

const after = db.prepare("SELECT id, name FROM accounts WHERE id = ?").get(NEW_ID);
say("");
say('Done: "' + after.name + '"  (id: ' + after.id + ")");
say("");
say("Sign out and back in afterwards: the page in your browser is still holding");
say("the old account id, so it will show stale data until it reloads the session.");
say("");
