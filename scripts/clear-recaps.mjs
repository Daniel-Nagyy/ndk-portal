// Deletes ALL daily recap rows from the database. Irreversible.
// Local:   node scripts/clear-recaps.mjs
// Railway: railway ssh  →  node scripts/clear-recaps.mjs
import { db } from "../db.mjs";
const n = db.prepare("DELETE FROM recaps").run().changes;
console.log(`Deleted ${n} recap row(s).`);
