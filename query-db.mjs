import Database from "better-sqlite3";

const db = new Database("ndk-portal.db");

console.log("=== TABLES ===");
console.log(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all());

console.log("\n=== ACCOUNTS ===");
console.log(db.prepare("SELECT id, name, geotab_database, netradyne_email FROM accounts").all());

console.log("\n=== USERS ===");
console.log(db.prepare("SELECT id, email, name, role, account_id FROM users").all());

console.log("\n=== SESSIONS ===");
console.log(db.prepare("SELECT token, user_id, expires_at FROM sessions").all());

console.log("\n=== PUSH SUBSCRIPTIONS ===");
console.log(db.prepare("SELECT id, user_id, account_id, endpoint FROM push_subscriptions").all());

db.close();
