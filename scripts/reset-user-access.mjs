// Log one user out everywhere and set a new password. Run ON the Railway
// container (railway ssh), where DB_PATH points at the production database:
//   node scripts/reset-user-access.mjs <email> [newPassword]
// Examples:
//   node scripts/reset-user-access.mjs dispatch@triplej.com               # log out only
//   node scripts/reset-user-access.mjs dispatch@triplej.com 'NewPass123'  # log out + new password
import { db, getUserByEmail, changePassword } from "../db.mjs";

const [email, newPassword] = process.argv.slice(2);
if (!email) {
  console.error("Usage: node scripts/reset-user-access.mjs <email> [newPassword]");
  process.exit(1);
}

const user = getUserByEmail(email);
if (!user) {
  console.error(`No user found with email: ${email}`);
  process.exit(1);
}

const killed = db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id).changes;
if (newPassword) changePassword(user.id, newPassword);

console.log(`${user.email} (${user.role}${user.account_id ? ", account " + user.account_id : ""}): ${killed} session(s) revoked.`);
console.log(newPassword ? "Password changed." : "No password given, so the password is unchanged.");
