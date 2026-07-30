// netradyne/auth.js — per-account authenticated Playwright contexts.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { NETRADYNE } from './config.js';
import { log } from './logger.js';

const BASE_DIR = './netradyne-browser-data';
const contexts = new Map(); // accountId -> persistent context (session reused across polls)
const validatedAt = new Map(); // accountId -> ms timestamp of last successful login check

function dirFor(accountId) {
  return join(BASE_DIR, accountId);
}

async function launch(accountId) {
  const dir = dirFor(accountId);
  mkdirSync(dir, { recursive: true });
  return chromium.launchPersistentContext(dir, {
    headless: true,
    args: ['--no-sandbox'],
  });
}

// account = { id, netradyneEmail, netradynePassword }
export async function getAuthenticatedContext(account) {
  const accountId = account.id;

  // 1. Reuse an in-process context if it's still logged in.
  const existing = contexts.get(accountId);
  if (existing) {
    // Skip the extra page-load login check if we validated recently — the scrape
    // itself will detect a lost session and we'll re-auth then. Saves ~5s/poll.
    const recheckMs = NETRADYNE.sessionRecheckMs || 10 * 60 * 1000;
    if (Date.now() - (validatedAt.get(accountId) || 0) < recheckMs) {
      return existing;
    }
    try {
      const page = await existing.newPage();
      await page.goto(NETRADYNE.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1000);
      const needsLogin = await page.$('#loginUserName');
      await page.close().catch(() => {});
      if (!needsLogin) { validatedAt.set(accountId, Date.now()); log.info(`[${accountId}] session reused`); return existing; }
    } catch (e) {
      log.warn(`[${accountId}] session check failed, re-authenticating`);
    }
    await existing.close().catch(() => {});
    contexts.delete(accountId);
    validatedAt.delete(accountId);
  }

  // 2. Launch the persistent context. If the saved session is still valid the app
  //    loads without a login form; otherwise the login form appears and we sign in.
  const context = await launch(accountId);
  try {
    const page = await context.newPage();
    await page.goto(NETRADYNE.url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    if (await page.$('#loginUserName')) {
      await login(page, account);
    } else {
      log.info(`[${accountId}] existing Netradyne session valid`);
    }
    await page.close().catch(() => {});
    contexts.set(accountId, context);
    validatedAt.set(accountId, Date.now());
    return context;
  } catch (err) {
    log.error(`[${accountId}] authentication failed: ${err.message}`);
    await context.close().catch(() => {});
    throw err;
  }
}

async function login(page, account) {
  // Step 1: username, then "Next".
  await page.fill('#loginUserName', account.netradyneEmail);
  await page.click('#login-submit-button');

  // Step 2: password, then "Login".
  await page.waitForSelector('input[name="pwd"]:visible', { timeout: 10000 });
  await page.fill('input[name="pwd"]', account.netradynePassword);
  await page.click('#login-submit-button');

  // Success = we leave the login screen (password field gone AND URL not on /login).
  // NOTE: the login page URL itself contains "/console/", so we must not match on that.
  try {
    await page.waitForFunction(() => {
      const onLogin = location.href.includes('/login');
      const hasPwd = !!document.querySelector('input[name="pwd"]');
      return !onLogin && !hasPwd;
    }, { timeout: 20000 });
  } catch (err) {
    // Still on the login screen after submit → bad credentials or a challenge.
    const errText = await page.evaluate(() => {
      const m = (document.body.innerText || '').match(/(invalid|incorrect|not found|wrong|failed|locked|expired|try again)[^\n]*/i);
      return m ? m[0] : null;
    }).catch(() => null);
    throw new Error(`login not accepted${errText ? ` (${errText})` : ' (still on login screen)'}`);
  }
  log.info(`[${account.id}] Netradyne authenticated`);
}
