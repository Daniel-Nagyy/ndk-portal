import pptxgen from "pptxgenjs";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import ReactDOMServer from "react-dom/server";
import * as Fi from "react-icons/fi";
import sharp from "sharp";

function pngSize(file) {
  const b = fs.readFileSync(file);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

// ---------- palette ----------
const BG = "0B0E13";
const CARD = "151C25";
const CARD2 = "1B2430";
const GREEN = "22C55E";
const GREEN_D = "16A34A";
const RED = "F04438";
const WHITE = "FFFFFF";
const MUTE = "93A4B5";
const LINE = "263241";

const HEAD = "Cambria";
const BODY = "Calibri";

async function icon(name, hex, px = 256) {
  const Comp = Fi[name];
  const svg = ReactDOMServer.renderToStaticMarkup(
    React.createElement(Comp, { color: "#" + hex, size: px, strokeWidth: 2 })
  );
  const buf = await sharp(Buffer.from(svg)).resize(px, px).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}
const ICONS = {};
async function loadIcons() {
  const map = {
    clock: "FiClock", truck: "FiTruck", barChart: "FiBarChart2", clipboard: "FiClipboard",
    eye: "FiEye", alert: "FiAlertTriangle", shield: "FiShield", file: "FiFileText",
    check: "FiCheckCircle", down: "FiTrendingDown", zap: "FiZap", phone: "FiSmartphone",
    alertR: "FiAlertOctagon", monitor: "FiMonitor", bell: "FiBell", users: "FiUsers",
  };
  for (const [k, comp] of Object.entries(map)) {
    const color = k === "alertR" ? RED : GREEN;
    ICONS[k] = await icon(comp, color);
  }
}
await loadIcons();

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
const W = 13.333, H = 7.5;

function bg(slide, color = BG) { slide.background = { color }; }

function iconChip(slide, img, cx, cy, d = 0.62, fill = CARD2) {
  slide.addShape(pres.ShapeType.roundRect, { x: cx, y: cy, w: d, h: d, rectRadius: d / 2.2, fill: { color: fill }, line: { color: LINE, width: 1 } });
  const p = d * 0.34;
  slide.addImage({ data: img, x: cx + p, y: cy + p, w: d - 2 * p, h: d - 2 * p });
}

// iPhone bezel frame around a mobile screenshot; returns the frame's outer box
function phoneFrame(slide, file, cx, topY, phoneH) {
  const dim = pngSize(file);
  const ar = dim.width / dim.height; // ~ 0.4615
  const screenH = phoneH - 0.34;
  const screenW = screenH * ar;
  const frameW = screenW + 0.22;
  const frameH = phoneH;
  const x = cx - frameW / 2;
  const y = topY;
  // outer body
  slide.addShape(pres.ShapeType.roundRect, {
    x, y, w: frameW, h: frameH, rectRadius: 0.34,
    fill: { color: "060809" }, line: { color: "3A4552", width: 2.25 },
    shadow: { type: "outer", color: "000000", blur: 20, offset: 10, angle: 90, opacity: 0.6 },
  });
  const sx = x + 0.11, sy = y + 0.17;
  slide.addImage({ path: file, x: sx, y: sy, w: screenW, h: screenH });
  // dynamic island
  slide.addShape(pres.ShapeType.roundRect, {
    x: cx - 0.42, y: sy + 0.09, w: 0.84, h: 0.16, rectRadius: 0.08, fill: { color: "060809" },
  });
  return { x, y, w: frameW, h: frameH };
}

const S = (f) => path.join("shots-mobile", "crop", f);
const D = (f) => path.join("shots", "crop", f);

// ============ SLIDE 1 — TITLE ============
{
  const s = pres.addSlide(); bg(s);
  s.addText("NDK DISPATCH", { x: 0.7, y: 0.55, w: 6, h: 0.4, fontFace: BODY, fontSize: 14, color: GREEN, bold: true, charSpacing: 3 });
  s.addText("Your whole fleet,\nrun from your phone.", {
    x: 0.7, y: 1.5, w: 6.0, h: 2.1, fontFace: HEAD, fontSize: 36, bold: true, color: WHITE, lineSpacing: 42,
  });
  s.addText("NDK Dispatch is the mobile command center built for Amazon Freight Partners — live HOS safety, trip status, and driver-safety alerts, pushed straight to the owner's phone.", {
    x: 0.72, y: 3.6, w: 5.7, h: 1.5, fontFace: BODY, fontSize: 15.5, color: MUTE, lineSpacing: 23,
  });
  const stats = [["24/7", "phone coverage"], ["400+", "drivers/day"], ["<30 min", "critical alerts"]];
  stats.forEach(([n, l], i) => {
    const x = 0.72 + i * 1.95;
    s.addText(n, { x, y: 5.5, w: 1.9, h: 0.5, fontFace: HEAD, fontSize: 24, bold: true, color: GREEN, margin: 0 });
    s.addText(l, { x, y: 6.0, w: 1.9, h: 0.6, fontFace: BODY, fontSize: 10.5, color: MUTE, margin: 0 });
  });
  phoneFrame(s, S("m-00-notification.png"), 10.55, 0.42, 6.7);
}

// ============ SLIDE 2 — CHALLENGE ============
{
  const s = pres.addSlide(); bg(s);
  s.addText("What keeps an AFP owner up at night", { x: 0.7, y: 0.55, w: 12, h: 0.7, fontFace: HEAD, fontSize: 30, bold: true, color: WHITE });
  s.addText("Amazon scores your account on safety and on-time performance every week.", { x: 0.72, y: 1.28, w: 11.8, h: 0.5, fontFace: BODY, fontSize: 15, color: MUTE });
  const items = [
    ["alertR", "HOS violations", "One driver over hours-of-service risks a shutdown, a fine, and your DOT record."],
    ["clock", "Missed pickups & late stops", "A late first stop ripples into chargebacks and a lower on-time score."],
    ["shield", "Falling safety scores", "Hard braking and distraction events quietly drag down your Netradyne rating."],
    ["file", "Admin overload", "Chasing BOLs and end-of-day recaps by phone and spreadsheet burns your team out."],
  ];
  const cw = 5.75, ch = 2.1, gx = 0.7, gy = 2.05, gapx = 0.55, gapy = 0.4;
  items.forEach(([ic, t, d], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = gx + col * (cw + gapx), y = gy + row * (ch + gapy);
    s.addShape(pres.ShapeType.roundRect, { x, y, w: cw, h: ch, rectRadius: 0.1, fill: { color: CARD }, line: { color: LINE, width: 1 } });
    iconChip(s, ICONS[ic], x + 0.35, y + 0.35, 0.7, "241417");
    s.addText(t, { x: x + 1.25, y: y + 0.32, w: cw - 1.5, h: 0.5, fontFace: BODY, fontSize: 17, bold: true, color: WHITE, margin: 0 });
    s.addText(d, { x: x + 1.25, y: y + 0.85, w: cw - 1.55, h: 1.1, fontFace: BODY, fontSize: 13, color: MUTE, lineSpacing: 18, margin: 0 });
  });
}

// ============ SLIDE 3 — SOLUTION OVERVIEW (mobile-first) ============
{
  const s = pres.addSlide(); bg(s);
  s.addText("Everything, in your pocket", { x: 0.7, y: 0.55, w: 7, h: 0.7, fontFace: HEAD, fontSize: 30, bold: true, color: WHITE });
  s.addText("The owner app puts the whole account on one home screen — no desktop required.", { x: 0.72, y: 1.28, w: 6.7, h: 0.6, fontFace: BODY, fontSize: 14.5, color: MUTE, lineSpacing: 19 });
  const cards = [
    ["truck", "Home command center", "Live risks, active trips, open issues and safety alerts at a glance."],
    ["clock", "HOS risk monitoring", "Every driver's break, drive, shift and cycle clock, flagged before a violation."],
    ["eye", "Netradyne safety alerts", "Live feed of distraction, hard-braking and traffic events to acknowledge."],
    ["clipboard", "Daily recap", "The full operating record: every block, VRID, BOL and time check."],
    ["alert", "Issue exception queue", "Every late, missing or flagged item pulled into one action list."],
    ["bell", "Push + Telegram alerts", "Critical HOS risk reaches the owner's phone even when the portal is closed."],
  ];
  const cw = 3.3, ch = 1.4, gx = 0.7, gy = 2.05, gapx = 0.3, gapy = 0.25;
  cards.forEach(([ic, t, d], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = gx + col * (cw + gapx), y = gy + row * (ch + gapy);
    s.addShape(pres.ShapeType.roundRect, { x, y, w: cw, h: ch, rectRadius: 0.1, fill: { color: CARD }, line: { color: LINE, width: 1 } });
    iconChip(s, ICONS[ic], x + 0.22, y + 0.22, 0.5);
    s.addText(t, { x: x + 0.22, y: y + 0.78, w: cw - 0.44, h: 0.3, fontFace: BODY, fontSize: 12.5, bold: true, color: WHITE, margin: 0 });
    s.addText(d, { x: x + 0.22, y: y + 1.06, w: cw - 0.44, h: 0.32, fontFace: BODY, fontSize: 9.5, color: MUTE, lineSpacing: 12, margin: 0 });
  });
  phoneFrame(s, S("m-01-home.png"), 10.75, 0.55, 6.6);
}

// ============ PHONE SCREENSHOT SLIDES ============
function phoneShotSlide(file, kicker, title, points) {
  const s = pres.addSlide(); bg(s);
  s.addText(kicker, { x: 0.7, y: 0.62, w: 4.9, h: 0.35, fontFace: BODY, fontSize: 13, bold: true, color: GREEN, charSpacing: 2 });
  s.addText(title, { x: 0.68, y: 1.0, w: 5.0, h: 1.35, fontFace: HEAD, fontSize: 26, bold: true, color: WHITE, lineSpacing: 29 });
  let y = 2.75;
  points.forEach(([t, d]) => {
    iconChip(s, ICONS.check, 0.7, y, 0.5);
    s.addText(t, { x: 1.32, y: y - 0.02, w: 4.25, h: 0.4, fontFace: BODY, fontSize: 15, bold: true, color: WHITE, margin: 0 });
    s.addText(d, { x: 1.32, y: y + 0.36, w: 4.3, h: 0.95, fontFace: BODY, fontSize: 12.5, color: MUTE, lineSpacing: 17, margin: 0 });
    y += 1.42;
  });
  phoneFrame(s, S(file), 10.1, 0.35, 6.8);
  return s;
}

phoneShotSlide("m-01-home.png", "OWNER HOME · MOBILE", "The whole operation, the moment you unlock your phone", [
  ["At-a-glance KPIs", "HOS risks, active trips, open issues and safety alerts — the numbers that matter, up top."],
  ["Live HOS risk board", "Drivers approaching limits surface as red and amber cards before they ever go over."],
  ["Phone alerts", "Critical risks push straight to the owner's phone, even when the portal is closed."],
]);

phoneShotSlide("m-02-hos-risks.png", "HOS RISK MONITORING · MOBILE", "Never lose a driver to hours-of-service again", [
  ["Every clock, every driver", "Break, drive, shift, cycle and reset timers for the full fleet, scrollable on one screen."],
  ["Ranked by risk", "On-duty drivers sort to the top, with the tightest clock flagged so dispatch acts first."],
  ["Readiness at a glance", "READY / NOT READY status keeps tomorrow's board staffed and legal."],
]);

phoneShotSlide("m-05-netradyne.png", "SAFETY ALERTS · MOBILE", "Protect your Netradyne score from your pocket", [
  ["Live safety feed", "Distraction, hard-braking, following-distance and traffic events as they happen."],
  ["Severity-ranked", "Severe events stand out in red so coaching happens the same day, not next week."],
  ["Acknowledge & track", "Clear each alert on the spot so nothing is missed and every event has an owner."],
]);

phoneShotSlide("m-06-issues.png", "EXCEPTION QUEUE · MOBILE", "Nothing slips through the cracks", [
  ["Auto-built from recap", "Late stops, missing check-ins and flagged notes become issue cards automatically."],
  ["Block-tagged", "Each issue carries its trip and block ID for instant follow-up."],
  ["Status-driven", "In-progress, delayed and upcoming states keep the desk honest — checkable in seconds."],
]);

phoneShotSlide("m-04-daily-recap.png", "DAILY RECAP · MOBILE", "The complete operating record, every day", [
  ["Block-level detail", "Trip ID, block, truck, DVIR, fuel and BOL status for every driver, every day."],
  ["Amazon Relay import", "Trips import straight from a Relay CSV — no manual re-keying."],
  ["Owner & dispatcher views", "Dispatchers edit; owners get a clean read-only mirror of the same day."],
]);

// ============ SLIDE — NOTIFICATION FEATURE ============
{
  const s = pres.addSlide(); bg(s);
  s.addText("PHONE ALERTS", { x: 0.7, y: 0.62, w: 4.9, h: 0.35, fontFace: BODY, fontSize: 13, bold: true, color: GREEN, charSpacing: 2 });
  s.addText("You'll know before Amazon does", { x: 0.68, y: 1.0, w: 5.3, h: 1.3, fontFace: HEAD, fontSize: 27, bold: true, color: WHITE, lineSpacing: 30 });
  const rows = [
    ["≤ 60 min remaining", "Warning alert in the browser and PWA — break, drive, duty, workday or cycle."],
    ["≤ 30 min remaining", "Critical alert pushed to the owner's phone and Telegram, instantly."],
    ["Portal closed? Doesn't matter.", "Telegram alerts keep firing as long as the dispatch server is running."],
  ];
  let y = 2.7;
  rows.forEach(([t, d]) => {
    iconChip(s, ICONS.bell, 0.7, y, 0.55);
    s.addText(t, { x: 1.4, y: y - 0.02, w: 4.3, h: 0.4, fontFace: BODY, fontSize: 15.5, bold: true, color: WHITE, margin: 0 });
    s.addText(d, { x: 1.4, y: y + 0.38, w: 4.35, h: 0.9, fontFace: BODY, fontSize: 12.5, color: MUTE, lineSpacing: 17, margin: 0 });
    y += 1.45;
  });
  phoneFrame(s, S("m-00-notification.png"), 10.1, 0.35, 6.8);
}

// ============ SLIDE — DESKTOP (brief) ============
{
  const s = pres.addSlide(); bg(s);
  iconChip(s, ICONS.monitor, 0.7, 0.62, 0.55);
  s.addText("ALSO AVAILABLE ON DESKTOP", { x: 1.42, y: 0.68, w: 6, h: 0.4, fontFace: BODY, fontSize: 13, bold: true, color: GREEN, charSpacing: 2, margin: 0 });
  s.addText("Same data, wide-screen view for the dispatch desk", { x: 0.68, y: 1.25, w: 11.8, h: 0.7, fontFace: HEAD, fontSize: 25, bold: true, color: WHITE });
  s.addText("Dispatchers and admins get the full wide-table view for daily recap, shift handoff and user management — the owner never has to leave their phone.", {
    x: 0.7, y: 1.95, w: 11.8, h: 0.5, fontFace: BODY, fontSize: 14, color: MUTE,
  });
  // desktop screenshot framed
  const file = D("02-hos-risks.png");
  const dim = pngSize(file);
  const ar = dim.width / dim.height;
  const boxW = 11.9, boxH = 4.75;
  let w = boxW, h = w / ar;
  if (h > boxH) { h = boxH; w = h * ar; }
  const x = (W - w) / 2, y = 2.6;
  s.addShape(pres.ShapeType.roundRect, { x: x - 0.08, y: y - 0.08, w: w + 0.16, h: h + 0.16, rectRadius: 0.08, fill: { color: CARD }, line: { color: LINE, width: 1 }, shadow: { type: "outer", color: "000000", blur: 16, offset: 6, angle: 90, opacity: 0.5 } });
  s.addImage({ path: file, x, y, w, h });
}

// ============ SLIDE — BENEFITS ============
{
  const s = pres.addSlide(); bg(s);
  s.addText("What this means for your AFP", { x: 0.7, y: 0.55, w: 12, h: 0.7, fontFace: HEAD, fontSize: 30, bold: true, color: WHITE });
  s.addText("Better scores, fewer surprises, and a dispatch desk that already knows what to do.", { x: 0.72, y: 1.28, w: 11.8, h: 0.5, fontFace: BODY, fontSize: 15, color: MUTE });
  const b = [
    ["shield", "Fewer HOS violations", "Every clock watched and flagged before it trips — protecting your DOT record and your contract."],
    ["down", "Higher safety rating", "Same-day coaching on Netradyne events steadily lifts your fleet's safety score."],
    ["clock", "Stronger on-time %", "Late-stop and missing-check-in exceptions get caught and cleared before Amazon sees them."],
    ["zap", "Less admin, more driving", "Relay import and auto-built recaps replace the spreadsheets and group-chat chasing."],
  ];
  const cw = 5.75, ch = 2.1, gx = 0.7, gy = 2.05, gapx = 0.55, gapy = 0.4;
  b.forEach(([ic, t, d], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = gx + col * (cw + gapx), y = gy + row * (ch + gapy);
    s.addShape(pres.ShapeType.roundRect, { x, y, w: cw, h: ch, rectRadius: 0.1, fill: { color: CARD }, line: { color: LINE, width: 1 } });
    iconChip(s, ICONS[ic], x + 0.35, y + 0.35, 0.7);
    s.addText(t, { x: x + 1.25, y: y + 0.32, w: cw - 1.5, h: 0.5, fontFace: BODY, fontSize: 17, bold: true, color: WHITE, margin: 0 });
    s.addText(d, { x: x + 1.25, y: y + 0.85, w: cw - 1.55, h: 1.1, fontFace: BODY, fontSize: 13, color: MUTE, lineSpacing: 18, margin: 0 });
  });
}

// ============ SLIDE — CLOSING / CTA ============
{
  const s = pres.addSlide(); bg(s);
  s.addShape(pres.ShapeType.roundRect, { x: 1.6, y: 1.5, w: 10.1, h: 4.5, rectRadius: 0.16, fill: { color: CARD }, line: { color: GREEN_D, width: 1.5 } });
  s.addText("NDK DISPATCH", { x: 0, y: 2.0, w: W, h: 0.4, align: "center", fontFace: BODY, fontSize: 14, bold: true, color: GREEN, charSpacing: 3 });
  s.addText("Let us run your desk.", { x: 0, y: 2.5, w: W, h: 0.9, align: "center", fontFace: HEAD, fontSize: 40, bold: true, color: WHITE });
  s.addText("You already saw the owner app. Behind it is a dispatch team watching HOS, safety and on-time performance for your fleet — every shift, every day.", {
    x: 3.0, y: 3.55, w: 7.3, h: 1.2, align: "center", fontFace: BODY, fontSize: 15, color: MUTE, lineSpacing: 23,
  });
  s.addText("Ready to protect your score and hand off the busywork? Let's get your fleet on the portal.", {
    x: 3.0, y: 4.75, w: 7.3, h: 0.8, align: "center", fontFace: BODY, fontSize: 14, italic: true, color: WHITE, lineSpacing: 20,
  });
}

await pres.writeFile({ fileName: process.argv[2] || "NDK-Dispatch-AFP-mobile.pptx" });
console.log("written");
