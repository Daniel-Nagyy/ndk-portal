import { chromium } from 'playwright';
import { existsSync, rmSync } from 'node:fs';
import { NETRADYNE } from './config.js';
import { log } from './logger.js';

const BROWSER_DIR = './netradyne-browser-data';

function cleanBrowserData() {
  if (existsSync(BROWSER_DIR)) {
    rmSync(BROWSER_DIR, { recursive: true, force: true });
    log.info('Cleared browser session data');
  }
}

export async function getAuthenticatedContext() {
  // 1. If a context exists, try to reuse it
  if (global.__netradyneContext) {
    try {
      const page = await global.__netradyneContext.newPage();
      await page.goto(NETRADYNE.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const isLoggedIn = !(await page.$('#loginUserName')) && !(await page.$('text=Sign In'));
      await page.close();
      if (isLoggedIn) {
        log.info('Netradyne session reused');
        return global.__netradyneContext;
      }
    } catch (e) {
      log.warn('Session check failed, re‑authenticating');
    }
    // Session invalid – close and clean
    await global.__netradyneContext.close().catch(() => {});
    global.__netradyneContext = null;
    cleanBrowserData();
  }

  // 2. Create a new persistent context
  const context = await chromium.launchPersistentContext(BROWSER_DIR, {
    headless: true,
    args: ['--no-sandbox'],
  });

  const page = await context.newPage();
  try {
    await page.goto('https://idms.netradyne.com', { waitUntil: 'networkidle', timeout: 30000 });

    // 3. Wait for the login form to appear
    try {
      await page.waitForSelector('#loginUserName:visible', { timeout: 10000 });
    } catch (err) {
      // Login form didn't appear – session data corrupted, start over
      log.warn('Login form not found – removing session data and retrying');
      await page.close().catch(() => {});
      await context.close().catch(() => {});
      cleanBrowserData();
      const freshContext = await chromium.launchPersistentContext(BROWSER_DIR, {
        headless: true,
        args: ['--no-sandbox'],
      });
      const freshPage = await freshContext.newPage();
      await freshPage.goto('https://idms.netradyne.com', { waitUntil: 'networkidle', timeout: 30000 });
      await freshPage.waitForSelector('#loginUserName:visible', { timeout: 10000 });
      // Continue with the fresh page/context
      global.__netradyneContext = freshContext;
      await login(freshPage);
      return freshContext;
    }

    // Login with the original page
    await login(page);
    global.__netradyneContext = context;
    return context;
  } catch (err) {
    log.error('Authentication failed: ' + err.message);
    await context.close().catch(() => {});
    throw err;
  }
}

async function login(page) {
  // Fill username
  await page.fill('#loginUserName', NETRADYNE.email);

  // Two‑step: click “Next” if visible
  const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
  if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nextBtn.click();
    await page.waitForTimeout(2000);
  }

  // Fill password
  await page.waitForSelector('input[name="pwd"]:visible', { timeout: 10000 });
  await page.fill('input[name="pwd"]', NETRADYNE.password);

  // Submit
  await page.click('button[type="submit"]');

  // Wait for console
  await page.waitForURL('**/console/**', { timeout: 15000 });
  log.info('Netradyne authenticated successfully');
}