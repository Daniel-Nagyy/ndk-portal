// Diagnose the Netradyne headless login/scrape for one account.
//   node scripts/verify-netradyne.mjs [accountId]        (headless, default)
//   HEADED=1 node scripts/verify-netradyne.mjs           (watch the browser)
// Writes step screenshots to scripts/nd-debug/ so we can see WHY login/scrape fails.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { NETRADYNE } from '../netradyne/config.js';
import { getAccountCredentials, listAccounts } from '../db.mjs';

const accountId = process.argv[2] || 'mgi-transportation';
const creds = getAccountCredentials(accountId);
if (!creds) {
  console.error(`Account not found: ${accountId}. Existing: ${listAccounts().map(a => a.id).join(', ')}`);
  process.exit(1);
}
const email = creds.netradyne.email;
const password = creds.netradyne.password;
console.log(`Account: ${creds.name} (${accountId})  netradyne user: ${email}`);
if (!email || !password) { console.error('No Netradyne credentials on this account.'); process.exit(1); }

const OUT = join('scripts', 'nd-debug');
mkdirSync(OUT, { recursive: true });
const shot = async (page, name) => { try { await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true }); console.log(`  · screenshot -> ${join(OUT, name)}.png`); } catch (_) {} };

const ALERTS_API_RE = /\/tenants\/\d+\/alertsDataLite/;
const VISIBLE_API_RE = /\/tenants\/\d+\/getVisibleAlerts/;

const ctx = await chromium.launchPersistentContext(join('netradyne-browser-data', accountId), {
  headless: process.env.HEADED !== '1',
  args: ['--no-sandbox'],
});

let sawAlertsApi = false, alertCount = null;
const page = await ctx.newPage();
page.on('response', async (r) => {
  if (ALERTS_API_RE.test(r.url())) {
    sawAlertsApi = true;
    try { const j = await r.json(); alertCount = (j?.data?.alerts || []).length; } catch (_) {}
    console.log(`  · alertsDataLite responded (${r.status()}) alerts=${alertCount}`);
  } else if (VISIBLE_API_RE.test(r.url())) {
    console.log(`  · getVisibleAlerts responded (${r.status()})`);
  }
});

try {
  console.log(`\n1) goto ${NETRADYNE.url}`);
  await page.goto(NETRADYNE.url, { waitUntil: 'networkidle', timeout: 30000 }).catch(e => console.log('   goto warn:', e.message));
  await page.waitForTimeout(2000);
  await shot(page, '1-landing');
  console.log('   url:', page.url());
  console.log('   title:', await page.title().catch(() => '?'));

  const hasLogin = await page.$('#loginUserName');
  if (hasLogin) {
    console.log('\n2) login form present — signing in');
    await page.fill('#loginUserName', email);
    await shot(page, '2-username');
    await page.click('#login-submit-button');
    await page.waitForSelector('input[name="pwd"]:visible', { timeout: 10000 }).catch(() => console.log('   ! password field never appeared'));
    await page.fill('input[name="pwd"]', password).catch(() => console.log('   ! could not fill password'));
    await shot(page, '3-password');
    await page.click('#login-submit-button').catch(() => {});
    try {
      await page.waitForFunction(() => !location.href.includes('/login') && !document.querySelector('input[name="pwd"]'), { timeout: 20000 });
      console.log('   login accepted');
    } catch {
      const err = await page.evaluate(() => (document.body.innerText || '').match(/(invalid|incorrect|not found|wrong|failed|locked|expired|try again|captcha|verify)[^\n]*/i)?.[0] || null).catch(() => null);
      console.log(`   ! still on login screen${err ? ` (${err})` : ''}`);
    }
    await shot(page, '4-after-login');
    console.log('   url:', page.url());
  } else {
    console.log('\n2) no login form — session already valid');
  }

  console.log('\n3) waiting for alerts API (up to 20s)…');
  await Promise.allSettled([
    page.waitForResponse(r => ALERTS_API_RE.test(r.url()), { timeout: 20000 }),
    page.waitForResponse(r => VISIBLE_API_RE.test(r.url()), { timeout: 8000 }),
  ]);
  await page.waitForTimeout(1500);
  await shot(page, '5-alerts-page');

  console.log('\n=== RESULT ===');
  console.log('alertsDataLite seen:', sawAlertsApi, '| alerts in payload:', alertCount);
  console.log('final url:', page.url());
  const modal = await page.evaluate(() => {
    const t = document.body.innerText || '';
    const m = t.match(/(mandate|new joiner|acknowledge|accept|consent|terms|welcome)[^\n]{0,60}/i);
    return m ? m[0] : null;
  }).catch(() => null);
  if (modal) console.log('possible blocking modal text:', modal);
} catch (e) {
  console.error('FATAL:', e.message);
} finally {
  await ctx.close().catch(() => {});
}
