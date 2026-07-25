import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const file = "file:///" + path.resolve("notif-mockup.html").replace(/\\/g, "/");
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
const page = await context.newPage();
await page.goto(file);
await page.waitForTimeout(300);
await page.screenshot({ path: "shots-mobile/m-00-notification.png" });
await browser.close();
console.log("saved");
