// Reset a user's password by email. Run ON the Railway container (railway ssh),
// where DB_PATH points at the production database:
//   node scripts/reset-password.mjs <email> <newPassword>
// Example:
//   node scripts/reset-password.mjs owner@triplej.com 'NDK@triplej'
import { getUserByEmail, changePassword } from "../db.mjs";

const [email, newPassword] = process.argv.slice(2);
if (!email || !newPassword) {
  console.error("Usage: node scripts/reset-password.mjs <email> <newPassword>");
  process.exit(1);
}

const user = getUserByEmail(email);
if (!user) {
  console.error(`No user found with email: ${email}`);
  process.exit(1);
}

changePassword(user.id, newPassword);
console.log(`Password updated for ${user.email} (${user.role}${user.account_id ? ", account " + user.account_id : ""}).`);
