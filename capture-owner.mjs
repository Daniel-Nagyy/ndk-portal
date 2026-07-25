import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";

const OUT = process.argv[2] || ".";
const BASE = "https://localhost:4174/";

const mkDriver = (id, driverName, currentStatus, breakDisplay, drivingDisplay, workdayDisplay, cycleRemainingDisplay, readiness) => ({
  id, driverName, currentStatus, breakDisplay, drivingDisplay,
  dutyDisplay: workdayDisplay, workdayDisplay, cycleRemainingDisplay,
  lastStatusChange: "09:42", lastRestStart: "2h 14m", lastRestStartIso: null,
  updatedAt: new Date().toISOString(), cycleResetDisplay: "18:00",
  remainingDisplay: "10:00", cycleTomorrowDisplay: "52:00", readiness,
});

const demoDrivers = [
  mkDriver("d1","Jawuan Anderson","D","0:11","2:40","5:20","41:00","READY"),
  mkDriver("d2","Darwen Santiago","ON","1:45","0:23","6:10","38:20","READY"),
  mkDriver("d3","Tony Walker","D","3:10","4:15","0:52","44:10","READY"),
  mkDriver("d4","Sofia Martinez","D","4:20","2:05","0:38","12:00","NOT READY"),
  mkDriver("d5","Marcus Reed","D","6:30","8:40","9:30","58:00","READY"),
  mkDriver("d6","Andre Coleman","ON","5:15","7:20","8:10","61:30","READY"),
  mkDriver("d7","Priya Nair","D","7:00","9:10","10:20","70:15","READY"),
  mkDriver("d8","Aiden Clark","ON","6:00","5:30","7:45","49:00","READY"),
  mkDriver("d9","Luis Ferreira","OFF","10:00","11:00","14:00","72:00","READY"),
  mkDriver("d10","Kevin Brooks","SB","10:00","11:00","14:00","30:00","READY"),
  mkDriver("d11","Devon Price","OFF","10:00","11:00","14:00","55:00","READY"),
  mkDriver("d12","Grace Okafor","D","8:10","9:40","11:00","66:00","READY"),
  mkDriver("d13","Hassan Ali","D","5:40","6:15","7:20","47:00","READY"),
  mkDriver("d14","Bianca Lopez","ON","3:30","4:50","6:00","33:00","READY"),
  mkDriver("d15","Owen Bennett","OFF","10:00","11:00","14:00","60:00","READY"),
];

const CID = "makowaves-logistics";
const R = (o) => ({ clientId: CID, dailyDate: "2026-06-15", tripDate: "2026-06-15",
  assignedDispatcherId: "u-dispatcher", shiftId: "s-early", vrids: [], ...o });
const recaps = [
  R({ id:"rec-1", driverAssigned:"Marcus Reed", status:"Completed", tripId:"117-4402", blockId:"BLK-9931", solo:"Solo 1", truck:"TRK-155", dvir:"Completed", fuel:"82%", onDuty:"On", requestedStart:"03:05", stopOneupcoming:"03:30", actualCheckIn:"03:28", scheduledFinal:"10:45", finalArrivalHome:"10:40", driverLogOff:"10:52", hosCheck:"30 Minutes Completed", lateFirstStop:false, issues:"", bol:"Uploaded", vrids:["VR-88121","VR-88122"], blockDeepDive:"Clean run, all stops on time." }),
  R({ id:"rec-2", driverAssigned:"Jawuan Anderson", status:"In Progress", tripId:"117-4410", blockId:"BLK-9940", solo:"Solo 2", truck:"TRK-118", dvir:"Pre Trip", fuel:"64%", onDuty:"On", requestedStart:"04:00", stopOneupcoming:"04:25", actualCheckIn:"04:31", scheduledFinal:"12:10", finalArrivalHome:"", driverLogOff:"", hosCheck:"HOS Risk", lateFirstStop:true, issues:"Break window tightening — 11 min to mandatory break. Coaching driver to nearest safe stop.", bol:"Pending", vrids:["VR-88130"], blockDeepDive:"Watch break clock closely." }),
  R({ id:"rec-3", driverAssigned:"Darwen Santiago", status:"In Progress", tripId:"117-4415", blockId:"BLK-9945", solo:"Solo 1", truck:"TRK-204", dvir:"Post Trip", fuel:"", onDuty:"On", requestedStart:"05:15", stopOneupcoming:"05:40", actualCheckIn:"05:47", scheduledFinal:"13:20", finalArrivalHome:"", driverLogOff:"", hosCheck:"Break upcoming", lateFirstStop:false, issues:"Fuel value below threshold at dispatch — flagged for review.", bol:"Missing", vrids:["VR-88141","VR-88142","VR-88143"], blockDeepDive:"Confirm BOL upload before final." }),
  R({ id:"rec-4", driverAssigned:"Tony Walker", status:"Delayed", tripId:"117-4420", blockId:"BLK-9950", solo:"Solo 2", truck:"", dvir:"Pre Trip", fuel:"71%", onDuty:"", requestedStart:"06:00", stopOneupcoming:"06:20", actualCheckIn:"06:38", scheduledFinal:"14:05", finalArrivalHome:"", driverLogOff:"", hosCheck:"HOS Risk", lateFirstStop:true, issues:"Late to first stop by 18 min due to yard congestion. Shift clock at 52 min.", bol:"Pending", vrids:["VR-88150"], blockDeepDive:"Reroute considered; held for HOS." }),
  R({ id:"rec-5", driverAssigned:"Andre Coleman", status:"Upcoming", tripId:"117-4433", blockId:"BLK-9962", solo:"Solo 1", truck:"TRK-133", dvir:"Not Started", fuel:"90%", onDuty:"On", requestedStart:"07:30", stopOneupcoming:"07:55", actualCheckIn:"", scheduledFinal:"15:10", finalArrivalHome:"", driverLogOff:"", hosCheck:"HOS - Shift Pre Check", lateFirstStop:false, issues:"", bol:"Not Required", vrids:["VR-88161","VR-88162"], blockDeepDive:"" }),
  R({ id:"rec-6", driverAssigned:"Priya Nair", status:"Completed", tripId:"117-4441", blockId:"BLK-9970", solo:"Solo 2", truck:"TRK-177", dvir:"Completed", fuel:"85%", onDuty:"On", requestedStart:"06:45", stopOneupcoming:"07:10", actualCheckIn:"07:09", scheduledFinal:"14:50", finalArrivalHome:"14:44", driverLogOff:"14:58", hosCheck:"30 Minutes Completed", lateFirstStop:false, issues:"", bol:"Uploaded", vrids:["VR-88170","VR-88171","VR-88172","VR-88173"], blockDeepDive:"Strong shift, no exceptions." }),
];

const initScript = `
(function(){
  try {
    localStorage.setItem("ndkPortalSession.v1", JSON.stringify({ userId: "u-owner" }));
    var raw = localStorage.getItem("ndkPortalState.v1");
    // seed a state object; app will normalize it
    var recaps = ${JSON.stringify(recaps)};
    var recapDays = [{ id:"day-${CID}-2026-06-15", clientId:"${CID}", date:"2026-06-15", source:"Amazon Relay import", importedAt:"2026-06-15 03:00", rowCount:6 }];
    if (raw) {
      var s = JSON.parse(raw);
      s.recaps = recaps; s.recapDays = recapDays;
      localStorage.setItem("ndkPortalState.v1", JSON.stringify(s));
    } else {
      window.__seedRecaps = { recaps: recaps, recapDays: recapDays };
    }
  } catch(e){}
  var demo = ${JSON.stringify(demoDrivers)};
  var _f = window.fetch;
  window.fetch = function(u, o){
    var url = (typeof u === "string") ? u : (u && u.url) || "";
    if (url.indexOf("/api/drivers-readiness") >= 0) {
      return Promise.resolve(new Response(JSON.stringify({ success:true, drivers: demo, totalDrivers: demo.length }), { status:200, headers:{ "Content-Type":"application/json" } }));
    }
    return _f.apply(this, arguments);
  };
})();
`;

const pages = [
  { view: "owner-mobile", file: "01-home.png" },
  { view: "owner-hos", file: "02-hos-risks.png" },
  { view: "owner-overview", file: "03-owner-overview.png" },
  { view: "owner-recap", file: "04-daily-recap.png" },
  { view: "netradyne-dashboard", file: "05-netradyne.png" },
  { view: "owner-issues", file: "06-issues.png" },
];

const browser = await chromium.launch({ args: ["--ignore-certificate-errors"] });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  ignoreHTTPSErrors: true,
});
await context.addInitScript(initScript);
const page = await context.newPage();

await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(3000);

// The app persists its state on load; now merge in recap rows + day, then reload.
await page.evaluate(({ recaps, cid }) => {
  const raw = localStorage.getItem("ndkPortalState.v1");
  const s = raw ? JSON.parse(raw) : {};
  s.recaps = recaps;
  s.recapDays = [{ id: "day-" + cid + "-2026-06-15", clientId: cid, date: "2026-06-15", source: "Amazon Relay import", importedAt: "2026-06-15 03:00", rowCount: 6 }];
  localStorage.setItem("ndkPortalState.v1", JSON.stringify(s));
  localStorage.setItem("ndkPortalSession.v1", JSON.stringify({ userId: "u-owner" }));
}, { recaps, cid: CID });
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(3000);

for (const p of pages) {
  const sel = `[data-view="${p.view}"]`;
  const btn = await page.$(sel);
  if (btn) { await btn.click(); }
  await page.waitForTimeout(2000);
  const dest = path.join(OUT, p.file);
  await page.screenshot({ path: dest, fullPage: true });
  console.log("saved", dest);
}

await browser.close();
console.log("done");
