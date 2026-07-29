(function () {
  const STORAGE_KEY = "ndkPortalState.v2";
  const SESSION_KEY = "ndkPortalSession.v1";
  const HOS_NOTIFICATION_KEY = "ndkPortalHosNotifications.v1";

  const NAV_ICONS = {
    dashboard: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
    recap: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M10 12h4"/><path d="M10 16h4"/><path d="M10 8h4"/></svg>',
    users: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    clients: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    announcements: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    settings: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    'owner-mobile': '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    'owner-hos': '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    'owner-overview': '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    'netradyne-dashboard': '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    'owner-issues': '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    'truck-tracker': '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
    'my-shifts': '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    takeover: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
  };

  function getNavIcon(name) {
    return NAV_ICONS[name] || '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';
  }

  // No hardcoded data. Accounts and users come from the backend (DB); HOS comes
  // from Geotab. These start empty and are populated from the server after login.
  const seedState = {
    users: [],
    clients: [],
    shifts: [],
    recaps: [],
    recapDays: [],
    hosDrivers: [],
    announcements: [],
    audit: [],
  };

  let state = normalizeState(loadState());
  let session = loadSession();
  let currentView = defaultView(getCurrentUser());
  let recapFilter = "all";
  let editingAccountId = null; // when set, the Accounts form edits this account instead of creating
  let downTrucks = []; // Truck Tracker rows — DB-backed only, never persisted to localStorage
  let truckStatusFilter = "all";
  let netradyneAlerts = [];
  let netradyneSearchText = '';
let netradyneSortColumn = 'occurredAt'; // default sort by date newest first
let netradyneSortDir = 'desc';
  let selectedRecapDate = getDefaultRecapDate(getCurrentUser());
  let expandedRecapIds = new Set(); // which mobile recap cards are expanded (survives re-render)
  let searchText = "";
  let ownerHosSearchText = "";
  let ownerHosStatusFilter = "";
  let ownerHosSortFilter = "violationRisk"; // default: highest-risk drivers first
  let ownerHosSortColumn = "";
  let ownerHosSortDir = "asc";
  let ownerHosPreserveSearchFocus = false;
  let ownerHosQuickReadiness = "";
  let ownerHosSelectedTimeZone = "";
  let ownerHosAutoRefreshMinutes = 5;
  let ownerHosAutoRefreshEnabled = false;
  let ownerHosAutoRefreshTimer = null;
  let ownerHosIsLoading = false;
  let ownerHosLastGeneratedAt = null;
  let ownerHosTotalDrivers = 0;
  let hosFiltersOpen = false;
  let installPromptEvent = null;
  let sidebarOpen = false;
  let hosNotified = loadHosNotificationMemory();
  window.showInAppBanner = showInAppBanner;



  const STATUS_MEMORY_KEY = "ndkPortalStatusNotifications.v1";
const ELAPSED_MEMORY_KEY = "ndkPortalElapsedNotifications.v1";
const THRESHOLD_MEMORY_KEY = "ndkPortalHosThresholdNotifications.v1";

function loadNotificationMemory(key) {
  try { return JSON.parse(localStorage.getItem(key)) || {}; }
  catch { return {}; }
}
function saveNotificationMemory(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

let statusNotified = loadNotificationMemory(STATUS_MEMORY_KEY);
let elapsedNotified = loadNotificationMemory(ELAPSED_MEMORY_KEY);
let thresholdNotified = loadNotificationMemory(THRESHOLD_MEMORY_KEY);
  const app = document.getElementById("app");
  const toast = document.getElementById("toast");

  registerServiceWorker();
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPromptEvent = event;
    backgroundRender();
  });

  // Auth is server-backed: ignore any stale local session and ask the server who we are.
  session = null;
  restoreSession();

  app.addEventListener("submit", handleSubmit);
  app.addEventListener("click", handleClick);
  app.addEventListener("change", handleChange);
  app.addEventListener("input", handleInput);

  // Periodically fetch live HOS data from the backend API for cross-device support
  async function pollHosApi() {
    try {
      const response = await fetch('/api/hos');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          processHosItems(result.data);
        }
      }
    } catch (e) {
      // API might not be reachable
    }
  }
  

async function fetchGeotabDriversReadiness() {
  const user = getCurrentUser();
  // HOS is available to owners/managers AND dispatchers (dispatch view has an HOS tab).
  if (!user || !["owner", "dispatcher"].includes(user.role)) return;
  ownerHosIsLoading = true;
  try {
    const response = await fetch('/api/drivers-readiness');
    if (!response.ok) return;
    const result = await response.json();
    console.log('📡 Raw HOS API response:', result);

    if (!result.success || !Array.isArray(result.drivers)) return;

    // Realistic maximums: break 10h, drive 11h, workday 14h, cycle 70h, reset 34h, 10h rest 10h, cycle tomorrow 70h
    const MAX = { break: 600, drive: 660, workday: 840, cycle: 4200, remaining: 600, cycleReset: 2040, cycleTomorrow: 4200 };

    function safeDisplay(value, max, fallback = '--') {
      if (typeof value === 'string') {
        // If it's already formatted like "8:42" or "Completed", return as-is
        if (value === '--' || value === 'Completed' || /^\d+:\d{2}$/.test(value)) return value;
        // Try parsing as string with possible "hrs" or "mins" (fallback)
        const minutes = parseDisplayToMinutes(value);
        return (Number.isFinite(minutes) && minutes <= max) ? value : fallback;
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        // If the number is within the realistic range, assume it's minutes; convert to HH:MM
        if (value <= max) {
          const hrs = Math.floor(value / 60);
          const mins = value % 60;
          return `${hrs}:${String(mins).padStart(2, '0')}`;
        }
        // Too large; show nothing
        return fallback;
      }
      return fallback;
    }
// Save old statuses before updating
const oldStatusMap = {};
(state.hosDrivers || []).forEach(d => {
  oldStatusMap[d.id] = d.currentStatus || d.status;
});
    state.hosDrivers = result.drivers.map((driver) => ({
      id: driver.id,
      clientId: user.clientId,
      driverName: driver.driverName || 'Unknown Driver',
      vehicle: null,
      currentStatus: driver.currentStatus || 'Unknown',
      status: driver.currentStatus || 'Unknown',
      breakDisplay: safeDisplay(driver.breakDisplay, MAX.break),
      drivingDisplay: safeDisplay(driver.drivingDisplay, MAX.drive),
      dutyDisplay: safeDisplay(driver.dutyDisplay, MAX.workday),
      workdayDisplay: safeDisplay(driver.workdayDisplay, MAX.workday),
      cycleRemainingDisplay: safeDisplay(driver.cycleRemainingDisplay, MAX.cycle),
      lastStatusChange: driver.lastStatusChange || '--',
      statusSinceIso: driver.lastRestStartIso || null,
      statusSinceDisplay: driver.lastRestStart || '--',
      activeTripId: null,
      updatedAt: driver.updatedAt || new Date().toISOString(),
      cycleResetDisplay: safeDisplay(driver.cycleResetDisplay, MAX.cycleReset),
      remainingDisplay: safeDisplay(driver.remainingDisplay, MAX.remaining),   // 10h rest
      cycleTomorrowDisplay: safeDisplay(driver.cycleTomorrowDisplay, MAX.cycleTomorrow),
      readiness: driver.readiness || 'NO LOGS'
    }));
    
// Append test drivers for notification & UI testing

// New alerts: status change, elapsed, thresholds
const now = new Date();
const thresholds = [60, 30, 10];
const metricFields = [
  { field: 'breakDisplay', label: 'Break' },
  { field: 'drivingDisplay', label: 'Drive' },
  { field: 'workdayDisplay', label: 'Shift' },
  { field: 'cycleRemainingDisplay', label: 'Cycle' },
];

for (const driver of state.hosDrivers) {
  // --- Status change detection ---
  const newStatus = driver.currentStatus || driver.status;
  const oldStatus = oldStatusMap[driver.id];
  if (oldStatus && oldStatus !== newStatus) {
    const wasOnDuty = oldStatus === 'D' || oldStatus === 'ON';
    const isOnDuty = newStatus === 'D' || newStatus === 'ON';
    if (wasOnDuty && !isOnDuty) {
      await sendStatusChangeNotification(driver, 'off');
    } else if (!wasOnDuty && isOnDuty) {
      await sendStatusChangeNotification(driver, 'on');
    }
  }

  // --- 30‑minute on‑duty elapsed ---
  const onDutyStatus = driver.currentStatus || driver.status;
  if (onDutyStatus === 'D' || onDutyStatus === 'ON') {
    const since = driver.statusSinceIso ? new Date(driver.statusSinceIso) : null;
    if (since) {
      const elapsed = (now - since) / 60000;
      if (elapsed >= 30) {
        const key = `${driver.id}:${driver.statusSinceIso}`;
        if (!elapsedNotified[key]) {
          elapsedNotified[key] = Date.now();
          saveNotificationMemory(ELAPSED_MEMORY_KEY, elapsedNotified);
          const title = `${driver.driverName} on duty for 30 min`;
          const body = `Status: ${displayStatus(onDutyStatus)} since ${driver.statusSinceDisplay || ''}`;
if (document.visibilityState === 'visible') {
  showInAppBanner(title, body, false);
} else {
  new Notification(title, { body, tag: `elapsed-${driver.id}`, requireInteraction: false });
}          await sendTelegramAlert(title, body);
        }
      }
    }
  }

  // --- HOS threshold alerts ---
  if (onDutyStatus === 'D' || onDutyStatus === 'ON') {
    for (const { field, label } of metricFields) {
      const minutes = parseDisplayToMinutes(driver[field]);
      if (!Number.isFinite(minutes) || minutes < 0) continue;
      for (const threshold of thresholds) {
        // Alert when value just dropped below the threshold (within a 5‑minute window)
        if (minutes <= threshold && minutes > threshold - 5) {
          const key = `${driver.id}:${field}:${threshold}`;
          if (!thresholdNotified[key]) {
            thresholdNotified[key] = Date.now();
            saveNotificationMemory(THRESHOLD_MEMORY_KEY, thresholdNotified);
            const title = `HOS ${label} at ${minutes} min`;
            const body = `${driver.driverName}: ${label} ${driver[field]} left`;
if (document.visibilityState === 'visible') {
  showInAppBanner(title, body, true);
} else {
  new Notification(title, { body, tag: `thresh-${driver.id}-${field}`, requireInteraction: true });
}            await sendTelegramAlert(title, body);
          }
        }
      }
    }
  }
}
    ownerHosTotalDrivers = result.totalDrivers || state.hosDrivers.length;
    ownerHosLastGeneratedAt = result.generatedAt || new Date().toISOString();
    saveState();
    backgroundRender();
    const currentUser = getCurrentUser();
    if (currentUser?.role === "owner") {
      await queueOwnerHosNotifications(currentUser);
      await syncHosAlertsToTelegram(state.hosDrivers);
    }
  } catch (e) {
    console.error('HOS API fetch error:', e);
  } finally {
    ownerHosIsLoading = false;
  }
}

  // Periodically fetch live Late Items data from the backend API
  async function pollLateItemsApi() {
    try {
      const response = await fetch('/api/late-items');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          processLateItems(result.data);
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  function processLateItems(items) {
    if (!items) return;
    if (currentView === "login") return;
    state.lateItems = items;
    saveState();
    backgroundRender();
  }

  function startOwnerHosAutoRefresh() {
    stopOwnerHosAutoRefresh();
    ownerHosAutoRefreshEnabled = true;
    ownerHosAutoRefreshTimer = setInterval(fetchGeotabDriversReadiness, ownerHosAutoRefreshMinutes * 60 * 1000);
    backgroundRender();
  }

  function stopOwnerHosAutoRefresh() {
    if (ownerHosAutoRefreshTimer) clearInterval(ownerHosAutoRefreshTimer);
    ownerHosAutoRefreshTimer = null;
    ownerHosAutoRefreshEnabled = false;
    backgroundRender();
  }

  function toggleOwnerHosAutoRefresh() {
    if (ownerHosAutoRefreshEnabled) {
      stopOwnerHosAutoRefresh();
    } else {
      startOwnerHosAutoRefresh();
    }
  }
async function pollNetradyneAlerts() {
  try {
    const res = await fetch('/api/netradyne/alerts');
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        netradyneAlerts = data.alerts || [];
        if (currentView === 'netradyne-dashboard') render();
      }
    }
  } catch (err) {
    // API may not be available yet
  }
}
function processHosItems(items) {
  if (!Array.isArray(items) || items.length === 0) return;
  if (currentView === "login") return;

  state.hosDrivers = items.map((item, index) => {
    const toDisplay = (value) => {
      if (typeof value === 'number') {
        const sign = value < 0 ? '-' : '';
        const abs = Math.abs(value);
        const hrs = Math.floor(abs / 60);
        const mins = abs % 60;
        return `${sign}${hrs}:${String(mins).padStart(2, '0')}`;
      }
      return value || '--';
    };

    return {
      id: `hos-ext-${index}`,
      clientId: "makowaves-logistics",
      driverName: item.driverName,
      vehicle: item.vehicle,
      status: normalizeHosStatusInput(item.status),
      currentStatus: normalizeHosStatusInput(item.status),
      breakDisplay: toDisplay(item.breakTime || item.breakDisplay),
      drivingDisplay: toDisplay(item.driving || item.drivingDisplay),
      dutyDisplay: toDisplay(item.duty || item.dutyDisplay),
      workdayDisplay: toDisplay(item.workday || item.workdayDisplay),
      cycleRemainingDisplay: toDisplay(item.cycle || item.cycleRemainingDisplay),
      lastStatusChange: item.lastStatusChange,
      statusSinceIso: item.statusSinceIso || null,
      statusSinceDisplay: item.statusSinceDisplay || null,
      activeTripId: "",
      updatedAt: item.scannedAt || new Date().toISOString(),
      cycleResetDisplay: toDisplay(item.cycleResetDisplay || '--'),
      remainingDisplay: toDisplay(item.remainingDisplay || '--'),
      cycleTomorrowDisplay: toDisplay(item.cycleTomorrowDisplay || '--'),
      readiness: item.readiness || 'NO LOGS'
    };
  });
  ownerHosTotalDrivers = state.hosDrivers.length;
  ownerHosLastGeneratedAt = new Date().toISOString();
  saveState();
  backgroundRender();
}
setInterval(pollNetradyneAlerts, 10000);
pollNetradyneAlerts();

  setInterval(pollHosApi, 10000); // Poll every 10 seconds
  pollHosApi(); // Initial poll

  setInterval(fetchGeotabDriversReadiness, 600000); // Refresh Geotab owner HOS every 30 seconds
  fetchGeotabDriversReadiness();

  setInterval(pollLateItemsApi, 10000); // Poll every 10 seconds for late items
  pollLateItemsApi(); // Initial poll for late items

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : structuredClone(seedState);
    } catch (error) {
      return structuredClone(seedState);
    }
  }

  function loadSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
    } catch (error) {
      return null;
    }
  }

  function loadHosNotificationMemory() {
    try {
      return JSON.parse(localStorage.getItem(HOS_NOTIFICATION_KEY)) || {};
    } catch (error) {
      return {};
    }
  }

  function saveHosNotificationMemory() {
    localStorage.setItem(HOS_NOTIFICATION_KEY, JSON.stringify(hosNotified));
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    navigator.serviceWorker.register("sw.js").catch((error) => {
      console.warn("NDK service worker registration failed", error);
    });
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const output = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
    return output;
  }

  // Subscribe this device to Web Push so alerts arrive when the app is closed.
  async function subscribeToPush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("Push not supported on this browser/device.");
      return { ok: false, reason: "unsupported" };
    }
    try {
      // Register explicitly (don't rely solely on serviceWorker.ready, which hangs
      // forever if a previous registration failed to install).
      await navigator.serviceWorker.register("sw.js");
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => setTimeout(() => reject(new Error("service worker not ready (timeout)")), 10000)),
      ]);
      const res = await fetch("/api/push/vapid-public-key");
      const info = await res.json();
      if (!info.configured || !info.key) return { ok: false, reason: "server_not_configured" };

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(info.key),
        });
      }

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription }),
      });
      return { ok: true };
    } catch (error) {
      console.warn("Push subscribe failed:", error);
      return { ok: false, reason: error.message || "error" };
    }
  }

  function normalizeState(nextState) {
    const normalized = nextState || structuredClone(seedState);
    normalized.users = normalized.users || [];
    normalized.clients = normalized.clients || [];
    normalized.shifts = normalized.shifts || [];
    normalized.recaps = normalized.recaps || [];
    normalized.recapDays = normalized.recapDays || [];
    if (!Array.isArray(normalized.hosDrivers) || !normalized.hosDrivers.length) {
      normalized.hosDrivers = structuredClone(seedState.hosDrivers || []);
    }
    normalized.announcements = normalized.announcements || [];
    normalized.audit = normalized.audit || [];
    normalized.recaps = normalized.recaps.filter((row) => !String(row.tripId || "").startsWith("Pending-"));

    normalized.recaps.forEach((row) => {
      row.dailyDate = row.dailyDate || todayISO();
      row.importSource = row.importSource || "Manual";
      row.importedAt = row.importedAt || "";
      if (!Array.isArray(row.vrids)) {
        row.vrids = String(row.vrids || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }
    });

    const dayKeys = new Set(normalized.recapDays.map((day) => recapDayKey(day.clientId, day.date)));
    normalized.recaps.forEach((row) => {
      const key = recapDayKey(row.clientId, row.dailyDate);
      if (row.clientId && row.dailyDate && !dayKeys.has(key)) {
        normalized.recapDays.push({
          id: `day-${row.clientId}-${row.dailyDate}`,
          clientId: row.clientId,
          date: row.dailyDate,
          source: row.importSource || "Manual",
          importedAt: row.importedAt || "",
          rowCount: normalized.recaps.filter((item) => item.clientId === row.clientId && item.dailyDate === row.dailyDate).length,
        });
        dayKeys.add(key);
      }
    });

    normalized.recapDays.sort((a, b) => b.date.localeCompare(a.date) || clientNameFromState(normalized, a.clientId).localeCompare(clientNameFromState(normalized, b.clientId)));
    return normalized;
  }

  async function loadRecaps() {
    try {
      const res = await fetch("/api/recaps", { credentials: "same-origin" });
      const data = await res.json();
      if (data.success && data.recaps) {
        state.recaps = data.recaps;
        state = normalizeState(state);
      }
    } catch (e) {
      console.warn("Failed to load recaps:", e);
    }
  }

  async function loadDownTrucks() {
    try {
      const res = await fetch("/api/down-trucks", { credentials: "same-origin" });
      const data = await res.json();
      if (data.success) downTrucks = Array.isArray(data.trucks) ? data.trucks : [];
    } catch (e) {
      console.warn("Failed to load down trucks:", e);
    }
  }

  let syncRecapsTimer = null;
  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (session) {
      clearTimeout(syncRecapsTimer);
      syncRecapsTimer = setTimeout(() => {
        fetch("/api/recaps/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recaps: state.recaps })
        }).catch(() => {});
      }, 2000);
    }
  }

  function saveSession() {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  function getCurrentUser() {
    if (!session) return null;
    return state.users.find((user) => user.id === session.userId) || null;
  }

  function defaultView(user) {
    if (!user) return "login";
    if (user.role === "admin") return "dashboard";
    if (user.role === "owner") return "owner-mobile";
    return "my-shifts";
  }

  function roleLabel(role) {
    return {
      admin: "Admin",
      superadmin: "Admin",
      owner: "Owner",
      manager: "Manager",
      dispatcher: "Dispatcher",
    }[role] || role;
  }

  // Map real backend roles onto the app's existing view/permission roles.
  function mapServerRole(role) {
    if (role === "superadmin") return "admin";
    if (role === "manager") return "owner"; // managers get the owner oversight + alerts view
    return role; // owner, dispatcher
  }

  // Inject a server-authenticated user into state.users so the rest of the app
  // (which reads state.users / role / clientId) keeps working, and return it.
  function applyServerUser(serverUser, account) {
    const appUser = {
      id: serverUser.id,
      name: serverUser.name || serverUser.email,
      email: serverUser.email,
      role: mapServerRole(serverUser.role),
      serverRole: serverUser.role,
      clientId: serverUser.accountId || null,
      accountName: account ? account.name : null,
      status: "active",
    };
    state.users = (state.users || []).filter((u) => u.id !== appUser.id && u.email !== appUser.email);
    state.users.push(appUser);
    return appUser;
  }

  // Map a server user (publicUser shape) into the app's user shape.
  function mapServerUserToApp(su) {
    return {
      id: su.id,
      name: su.name || su.email,
      email: su.email,
      role: mapServerRole(su.role),
      serverRole: su.role,
      clientId: su.accountId || null,
      status: "active",
    };
  }

  // Load real accounts + users from the backend. Replaces hardcoded seed data so
  // clients/users everywhere come from the database, not app.js.
  async function loadAccountsAndUsers() {
    try {
      const [accRes, usrRes] = await Promise.all([
        fetch("/api/admin/accounts", { credentials: "same-origin" }).then((r) => r.json()).catch(() => null),
        fetch("/api/admin/users", { credentials: "same-origin" }).then((r) => r.json()).catch(() => null),
      ]);
      if (accRes && accRes.success) {
        state.clients = accRes.accounts.map((a) => ({
          id: a.id,
          name: a.name,
          active: true,
          apiKey: a.apiKey || null,
          geotabServer: a.geotabServer || "",
          geotabDatabase: a.geotabDatabase || "",
          geotabUsername: a.geotabUsername || "",
          netradyneEmail: a.netradyneEmail || "",
          telegramChatId: a.telegramChatId || "",
          hasGeotab: Boolean(a.hasGeotab),
          hasNetradyne: Boolean(a.hasNetradyne),
          hasTelegram: Boolean(a.hasTelegram),
        }));
      }
      if (usrRes && usrRes.success) {
        const current = getCurrentUser();
        state.users = usrRes.users.map(mapServerUserToApp);
        // Keep the signed-in user present (with its accountName for the header).
        const idx = state.users.findIndex((u) => u.id === current?.id);
        if (current && idx === -1) state.users.push(current);
        else if (current && idx >= 0) state.users[idx].accountName = current.accountName;
      }
      saveState();
    } catch (error) {
      console.warn("Failed to load accounts/users:", error);
    }
  }

  // Restore the session from the server's HttpOnly cookie on page load.
  async function restoreSession() {
    try {
      const res = await fetch("/api/me", { credentials: "same-origin" });
      const data = await res.json();
      if (data.success && data.user) {
        const appUser = applyServerUser(data.user, data.account);
        session = { userId: appUser.id };
        currentView = defaultView(appUser);
        render();
        await loadAccountsAndUsers();
        await loadRecaps();
        await loadDownTrucks();
        render();
        if (appUser.role === "owner") fetchGeotabDriversReadiness();
      } else {
        session = null;
        currentView = "login";
        render();
      }
    } catch (error) {
      console.warn("Session restore failed:", error);
    }
  }

  function clientName(clientId) {
    const client = state.clients.find((item) => item.id === clientId);
    if (client) return client.name;
    // Server-backed accounts aren't in state.clients; use the signed-in user's account name.
    const user = getCurrentUser();
    if (user && user.clientId === clientId && user.accountName) return user.accountName;
    return "NDK Dispatch";
  }

  function clientNameFromState(sourceState, clientId) {
    const client = (sourceState.clients || []).find((item) => item.id === clientId);
    return client ? client.name : "NDK Dispatch";
  }

  function recapDayKey(clientId, date) {
    return `${clientId || "all"}::${date || ""}`;
  }

  function formatDateLabel(date) {
    if (!date) return "No date";
    const [year, month, day] = date.split("-").map(Number);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(year, month - 1, day));
  }
function renderNetradyneDashboard(user) {
  const alerts = [...netradyneAlerts];

  // ---- Search ----
  const query = netradyneSearchText.trim().toLowerCase();
  const filtered = query
    ? alerts.filter(a =>
        (a.driverName || '').toLowerCase().includes(query) ||
        (a.eventType || '').toLowerCase().includes(query) ||
        (a.vehicleNumber || '').toLowerCase().includes(query) ||
        (a.externalAlertId || '').toLowerCase().includes(query) ||
        (a.severity || '').toLowerCase().includes(query)
      )
    : alerts;

  // ---- Split into unacknowledged and acknowledged ----
  const unacked = filtered.filter(a => a.status !== 'Acknowledged');
  const acked = filtered.filter(a => a.status === 'Acknowledged');

  // ---- Sort helper (applied to both lists) ----
  const sortList = (list) => {
    list.sort((a, b) => {
      const dir = netradyneSortDir === 'asc' ? 1 : -1;
      if (netradyneSortColumn === 'driverName') {
        return dir * (a.driverName || '').localeCompare(b.driverName || '');
      }
      if (netradyneSortColumn === 'severity') {
        const sevOrder = { Severe: 0, Moderate: 1, Positive: 2 };
        return dir * ((sevOrder[a.severity] ?? 99) - (sevOrder[b.severity] ?? 99));
      }
      if (netradyneSortColumn === 'eventType') {
        return dir * (a.eventType || '').localeCompare(b.eventType || '');
      }
      return dir * (new Date(a.occurredAt || 0) - new Date(b.occurredAt || 0));
    });
  };

  sortList(unacked);
  sortList(acked);

  // ---- Severity class helper ----
  const sevClass = (s) => {
    if (s === 'Severe') return 'badge-red';
    if (s === 'Moderate') return 'badge-amber';
    return 'badge-green';
  };

  // ---- Card template ----
  const renderCard = (a) => {
    const time = a.occurredAt && !isNaN(Date.parse(a.occurredAt))
      ? new Date(a.occurredAt).toLocaleString()
      : a.occurredAt || 'Unknown';
    const cardClass = a.severity === 'Severe' ? 'late-item-card severe-alert' : 'late-item-card';
    return `
      <div class="${cardClass}">
        <div class="lic-header">
          <div class="lic-info">
            <strong class="lic-driver">${escapeHtml(a.driverName || 'Unknown')}</strong>
            <span class="lic-vrid">${escapeHtml(a.eventType)}</span>
          </div>
          <div class="lic-late-badge">${escapeHtml(a.vehicleNumber || 'N/A')}</div>
        </div>
        <div class="lic-details">
          <div class="lic-detail-item"><span class="lic-detail-label">Time</span><strong>${escapeHtml(time)}</strong></div>
          <div class="lic-detail-item">
            <span class="lic-detail-label">Severity</span>
            <span class="status-pill-badge ${sevClass(a.severity)}">${escapeHtml(a.severity || 'Unknown')}</span>
          </div>
        </div>
        ${a.status !== 'Acknowledged' ? `
        <button class="btn btn-small btn-secondary" data-action="acknowledge-alert" data-alert-id="${a.id}" style="margin-top:8px;">Acknowledge</button>
        ` : ''}
      </div>
    `;
  };

  return `
    <div class="content">
      <div class="section-title">
        <h2>Netradyne Alerts</h2>
        <p>Live monitor for driver safety events</p>
      </div>

      <!-- Search & Sort Controls -->
      <div class="hos-controls-bar" style="margin-bottom:12px;">
        <input type="search" placeholder="Search alerts..." value="${escapeHtml(netradyneSearchText)}" data-netradyne-search class="toolbar-input" />
        <div style="display:flex; gap:8px; margin-top:8px;">
          <button class="btn btn-small btn-secondary" data-netradyne-sort="occurredAt">Date ${netradyneSortColumn==='occurredAt' ? (netradyneSortDir==='asc'?'▲':'▼') : ''}</button>
          <button class="btn btn-small btn-secondary" data-netradyne-sort="severity">Severity ${netradyneSortColumn==='severity' ? (netradyneSortDir==='asc'?'▲':'▼') : ''}</button>
          <button class="btn btn-small btn-secondary" data-netradyne-sort="driverName">Driver ${netradyneSortColumn==='driverName' ? (netradyneSortDir==='asc'?'▲':'▼') : ''}</button>
          <button class="btn btn-small btn-secondary" data-netradyne-sort="eventType">Type ${netradyneSortColumn==='eventType' ? (netradyneSortDir==='asc'?'▲':'▼') : ''}</button>
        </div>
      </div>

      <!-- Unacknowledged Alerts -->
      <div class="mobile-section-head" style="margin-bottom:8px;">
        <div class="section-head-text">
          <div class="section-head-icon followup-icon">🔔</div>
          <div>
            <h3>Unacknowledged</h3>
            <p>${unacked.length} alert${unacked.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>
      <div class="mobile-card-list" style="margin-bottom:20px;">
        ${unacked.length === 0 ? '<div class="empty-state">All alerts acknowledged.</div>' : ''}
        ${unacked.map(renderCard).join('')}
      </div>

      <!-- Acknowledged Alerts -->
      <div class="mobile-section-head" style="margin-bottom:8px;">
        <div class="section-head-text">
          <div class="section-head-icon dispatch-icon">✅</div>
          <div>
            <h3>Acknowledged</h3>
            <p>${acked.length} alert${acked.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>
      <div class="mobile-card-list">
        ${acked.length === 0 ? '<div class="empty-state">No acknowledged alerts yet.</div>' : ''}
        ${acked.map(renderCard).join('')}
      </div>
    </div>
  `;
}

  function availableRecapDates(user) {
    const dates = new Set();
    state.recapDays.forEach((day) => {
      if (!canSeeClient(user, day.clientId)) return;
      dates.add(day.date);
    });
    state.recaps.forEach((row) => {
      if (!canSeeClient(user, row.clientId)) return;
      dates.add(row.dailyDate);
    });
    return [...dates].filter(Boolean).sort((a, b) => b.localeCompare(a));
  }

  function getDefaultRecapDate(user) {
    return availableRecapDates(user)[0] || todayISO();
  }

  function canSeeClient(user, clientId) {
    if (!user || user.role === "admin") return true;
    return user.clientId === clientId;
  }

  function ensureSelectedRecapDate(user) {
    const dates = availableRecapDates(user);
    if (!dates.length) {
      selectedRecapDate = todayISO();
      return;
    }
    if (!dates.includes(selectedRecapDate)) {
      selectedRecapDate = dates[0];
    }
  }

  function recapDayDetails(user) {
    const days = state.recapDays.filter((day) => day.date === selectedRecapDate && canSeeClient(user, day.clientId));
    const rowCount = state.recaps.filter((row) => row.dailyDate === selectedRecapDate && canSeeClient(user, row.clientId)).length;
    const sources = [...new Set(days.map((day) => day.source).filter(Boolean))];
    return {
      rowCount,
      source: sources.length ? sources.join(", ") : "Manual",
      clientCount: new Set(days.map((day) => day.clientId)).size || 1,
    };
  }

  function userName(userId) {
    const user = state.users.find((item) => item.id === userId);
    return user ? user.name : "Unassigned";
  }

  function initials(name) {
    return String(name || "NDK")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Re-render triggered by a background poll (every 10s). Skip the full DOM rebuild
  // when it would disrupt the user: while typing, or on data-entry/detail views where
  // a rebuild wipes what they're doing (e.g. daily recap). Data still updates in state
  // and the view refreshes when they navigate or interact.
  const DATA_ENTRY_VIEWS = ["recap", "owner-recap", "dispatcher-recap", "users", "clients", "announcements", "settings"];
  function backgroundRender() {
    if (currentView === "login") return;
    const ae = document.activeElement;
    const typing = ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName || "");
    if (typing || DATA_ENTRY_VIEWS.includes(currentView)) return;
    render();
  }

  // Refresh a single recap row's "has issue" indicator in place (no full re-render,
  // so the cursor stays put while editing).
  function updateRecapRowStatus(el, row) {
    if (!el || !row) return;
    const missing = (typeof missingRequired === "function") ? missingRequired(row) : [];
    const hasIssue = Boolean((row.issues && String(row.issues).trim()) || missing.length > 0);
    if (el.classList && el.classList.contains("recap-card-v2")) {
      el.classList.toggle("has-issue", hasIssue);
      const badge = el.querySelector(".rcv-issue-badge");
      if (badge) {
        badge.classList.toggle("issue", hasIssue);
        badge.classList.toggle("clean", !hasIssue);
        badge.textContent = hasIssue ? "⚠" : "✓";
      }
    }
  }

  function render() {
    const user = getCurrentUser();
    if (!user) {
      // Preserve form values before re-rendering
      const emailInput = document.getElementById("email");
      const passwordInput = document.getElementById("password");
      const emailValue = emailInput ? emailInput.value : "";
      const passwordValue = passwordInput ? passwordInput.value : "";

      app.className = "app";
      app.innerHTML = renderLogin();

      // Restore form values after re-rendering
      const restoredEmailInput = document.getElementById("email");
      const restoredPasswordInput = document.getElementById("password");
      if (restoredEmailInput) restoredEmailInput.value = emailValue;
      if (restoredPasswordInput) restoredPasswordInput.value = passwordValue;
      return;
    }

    // Preserve ALL form field values + focus/cursor across the re-render. The 10s
    // background polls call render(), which rebuilds the DOM; without this, whatever
    // you're typing into a form (e.g. Create user) loses focus and gets wiped.
    const activeEl = document.activeElement;
    let focusInfo = null;
    const formValues = [];
    document.querySelectorAll('form[data-form]').forEach((form) => {
      const key = form.dataset.form;
      form.querySelectorAll('input, select, textarea').forEach((input) => {
        if (!input.name) return;
        formValues.push({ form: key, name: input.name, value: input.value });
        if (input === activeEl) {
          focusInfo = {
            form: key, name: input.name,
            start: input.selectionStart, end: input.selectionEnd,
          };
        }
      });
    });

    // Keep focus/caret in the search box (it's not inside a data-form).
    const searchFocused = activeEl && activeEl.getAttribute && activeEl.getAttribute("data-search") !== null && activeEl.hasAttribute("data-search");
    const searchSel = searchFocused ? [activeEl.selectionStart, activeEl.selectionEnd] : null;

    if (!isAllowedView(user, currentView)) {
      currentView = defaultView(user);
    }
    ensureSelectedRecapDate(user);

    app.className = "app portal-shell";
    const isHosView = currentView === "owner-hos";
    app.innerHTML = `
      ${renderSidebar(user)}
      <main class="main${isHosView ? " main--hos" : ""}">
        ${renderTopbar(user)}
        <section class="content${isHosView ? " content--hos" : ""}">
          ${renderView(user)}
        </section>
      </main>
    `;

    // Restore all form field values + focus/cursor after re-rendering.
    formValues.forEach(({ form, name, value }) => {
      const el = document.querySelector(`form[data-form="${form}"] [name="${name}"]`);
      if (el && el.value !== value) el.value = value;
    });
    if (searchFocused) {
      const el = document.querySelector("[data-search]");
      if (el) { el.focus(); try { el.setSelectionRange(searchSel[0], searchSel[1]); } catch (_) {} }
    }
    if (focusInfo) {
      const el = document.querySelector(`form[data-form="${focusInfo.form}"] [name="${focusInfo.name}"]`);
      if (el) {
        el.focus();
        try { if (el.setSelectionRange && focusInfo.start != null) el.setSelectionRange(focusInfo.start, focusInfo.end); } catch (_) {}
      }
    }

    queueOwnerHosNotifications(user);
    if (ownerHosPreserveSearchFocus && currentView === "owner-hos") {
      const searchInput = document.getElementById("hosSearchInput");
      if (searchInput) {
        searchInput.focus();
        const end = searchInput.value.length;
        searchInput.setSelectionRange(end, end);
      }
      ownerHosPreserveSearchFocus = false;
    }
  }

  function renderLogin() {
    return `
      <section class="login-screen">
        <aside class="login-brand">
          <div class="brand-lockup">
            <img src="ndk.png" alt="NDK" class="brand-mark" />
            <div class="brand-text">
              <strong>NDK Dispatch Portal</strong>
              <span>Command center for AFP operations</span>
            </div>
          </div>

          <div class="login-copy">
            <div class="eyebrow">24/7 dispatch operations</div>
            <h1>Control every shift from one desk.</h1>
            <p>Dispatchers handle active tours, owners track account performance, and admins manage users, clients, shifts, and daily recaps from a single internal workspace.</p>
          </div>
        </aside>

        <div class="login-panel-wrap">
          <form class="login-panel" data-form="login">
            <h2>Sign in</h2>
            <p class="hint">Enter the email and password for your NDK Dispatch account.</p>

            <div class="field">
              <label for="email">Email</label>
              <input id="email" name="email" type="email" required />
            </div>
            <div class="field">
              <label for="password">Password</label>
              <input id="password" name="password" type="password" required />
            </div>

            <div class="login-actions">
              <button class="btn btn-primary" type="submit">Sign in</button>
              ${isStandalone() ? "" : `<button class="btn btn-secondary" type="button" data-action="install-app">📲 Install app</button>`}
            </div>
            ${isStandalone() ? "" : `<p class="hint" style="margin-top:10px">Install to your phone for notifications. <strong>iPhone:</strong> Share → Add to Home Screen, then open that icon.</p>`}
          </form>
        </div>
      </section>
    `;
  }

function renderSidebar(user) {
  const navItems = getNavItems(user.role);
  return `
    <aside class="sidebar ${sidebarOpen ? 'sidebar--open' : ''}" id="sidebar">
      <!-- Brand block (visible on desktop, hidden on mobile) -->
      <div class="sidebar-top">
        <div class="brand-lockup">
          <img src="ndk.png" alt="NDK" class="brand-mark" />
          <div class="brand-text">
            <strong>NDK Dispatch</strong>
            <span>${escapeHtml(clientName(user.clientId))}</span>
          </div>
        </div>
        <div class="account-card">
          <strong>${escapeHtml(clientName(user.clientId))}</strong>
          <span>${escapeHtml(roleLabel(user.role))} access</span>
        </div>
      </div>

      <nav class="nav" aria-label="Portal navigation">
        ${navItems.map((item) => `
          <button class="nav-btn ${currentView === item.id ? "active" : ""}" type="button" data-view="${item.id}">
            <span class="nav-ico">${getNavIcon(item.icon)}</span>
            <span>${escapeHtml(item.label)}</span>
          </button>
        `).join("")}
      </nav>

      <div class="sidebar-footer">
        <button class="btn btn-secondary" type="button" data-action="logout"><span>Log out</span></button>
      </div>
      <button class="sidebar-close-btn" type="button" data-action="toggle-sidebar" aria-label="Close menu">✕</button>
    </aside>
    <div class="sidebar-overlay ${sidebarOpen ? 'is-visible' : ''}" data-action="toggle-sidebar"></div>
  `;
}
function renderTopbar(user) {
  const compact = currentView === "owner-hos";
  return `
    <header class="topbar${compact ? " topbar--compact" : ""}">
      <div class="topbar-brand">
        <img src="ndk.png" alt="NDK" class="brand-mark" />
        <div class="brand-text">
          <strong>NDK Dispatch</strong>
          <span>${escapeHtml(clientName(user.clientId))}</span>
        </div>
      </div>
      <div class="topbar-title">
        <h1>${escapeHtml(viewTitle(currentView, user.role))}</h1>
        <div class="topbar-sub">${escapeHtml(todayLabel())} · ${escapeHtml(roleLabel(user.role))} · ${escapeHtml(clientName(user.clientId))}</div>
      </div>
      <div class="topbar-actions">
        <button class="hamburger-btn" type="button" data-action="toggle-sidebar" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </header>
  `;
}

  // Local calendar date as YYYY-MM-DD (used as the recap default instead of a fixed date).
  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function todayLabel() {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date());
  }

  function getNavItems(role) {
    const shared = [{ id: "settings", label: "Settings", icon: "settings" }];
    if (role === "admin") {
      return [
        { id: "dashboard", label: "Command Center", icon: "dashboard" },
        { id: "recap", label: "Daily Recap", icon: "recap" },
        { id: "users", label: "Users", icon: "users" },
        { id: "clients", label: "Clients", icon: "clients" },
        { id: "announcements", label: "Announcements", icon: "announcements" },
        ...shared,
      ];
    }
    if (role === "owner") {
      return [
        { id: "owner-mobile", label: "Home", icon: "owner-mobile" },
        { id: "owner-hos", label: "HOS Risks", icon: "owner-hos" },
        { id: "owner-recap", label: "Daily Recap", icon: "recap" },
        { id: 'netradyne-dashboard', label: 'Netradyne Alerts', icon: 'netradyne-dashboard' },
        { id: "truck-tracker", label: "Truck Tracker", icon: "truck-tracker" },
      ];
    }
    return [
      { id: "my-shifts", label: "My Shifts", icon: "my-shifts" },
      { id: "owner-hos", label: "HOS Risks", icon: "owner-hos" },
      { id: "netradyne-dashboard", label: "Netradyne Alerts", icon: "netradyne-dashboard" },
      { id: "dispatcher-recap", label: "Daily Recap", icon: "recap" },
      { id: "truck-tracker", label: "Truck Tracker", icon: "truck-tracker" },
      { id: "takeover", label: "Takeover Board", icon: "takeover" },
      { id: "announcements", label: "Announcements", icon: "announcements" },
      ...shared,
    ];
  }

  function isAllowedView(user, view) {
    return getNavItems(user.role).some((item) => item.id === view);
  }

  function viewTitle(view, role) {
    const item = getNavItems(role).find((nav) => nav.id === view);
    return item ? item.label : "Portal";
  }

  function renderView(user) {
    if (currentView === "dashboard") return renderAdminDashboard(user);
    if (currentView === 'netradyne-dashboard') return renderNetradyneDashboard(user);
    if (currentView === "recap" || currentView === "owner-recap" || currentView === "dispatcher-recap") {
      return renderRecapPage(user);
    }
    if (currentView === "shifts" || currentView === "owner-shifts") return renderShiftsPage(user);
    if (currentView === "users") return renderUsersPage();
    if (currentView === "clients") return renderClientsPage();
    if (currentView === "announcements") return renderAnnouncementsPage(user);
    if (currentView === "my-shifts") return renderDispatcherHome(user);
    if (currentView === "takeover") return renderTakeoverPage(user);
    if (currentView === "owner-mobile") return renderOwnerMobileApp(user);
    if (currentView === "owner-hos") return renderOwnerHosPage(user);
    if (currentView === "owner-overview") return renderOwnerOverview(user);
    if (currentView === "owner-team") return renderOwnerTeam(user);
    if (currentView === "owner-issues") return renderOwnerIssues(user);
    if (currentView === "truck-tracker") return renderTruckTracker(user);
    if (currentView === "settings") return renderSettings(user);
    return renderAdminDashboard(user);
  }

  function visibleRecaps(user) {
    let rows = state.recaps.filter((row) => row.dailyDate === selectedRecapDate);
    if (user.role === "dispatcher") {
      rows = rows.filter((row) => row.assignedDispatcherId === user.id || row.assignedDispatcherId === null);
    }
    if (user.role === "owner") {
      rows = rows.filter((row) => row.clientId === user.clientId);
    }
    if (recapFilter === "issues") {
      rows = rows.filter((row) => row.issues || missingRequired(row).length > 0 || row.lateFirstStop);
    }
    if (recapFilter === "mine" && user.role === "dispatcher") {
      rows = rows.filter((row) => row.assignedDispatcherId === user.id);
    }
    if (recapFilter === "open") {
      rows = rows.filter((row) => row.status !== "Completed");
    }
    return applySearch(rows, ["driverAssigned", "tripId", "blockId", "truck", "issues", "vrids"]);
  }

  function visibleShifts(user) {
    let rows = state.shifts;
    if (user.role === "dispatcher") {
      rows = rows.filter((row) => row.assignedDispatcherId === user.id || row.assignedDispatcherId === null);
    }
    if (user.role === "owner") {
      rows = rows.filter((row) => row.clientId === user.clientId);
    }
    return applySearch(rows, ["date", "start", "end", "status", "desk", "handoff"]);
  }

  function visibleHosDrivers(user) {
    let rows = state.hosDrivers || [];
    if (user.role === "owner") {
      rows = rows.filter((row) => row.clientId === user.clientId);
    }
    if (user.role === "dispatcher") {
      rows = rows.filter((row) => row.assignedDispatcherId === user.id);
    }
    return applySearch(rows, ["driverName", "vehicle", "status", "activeTripId"]);
  }

  function normalizeHosStatus(status) {
    return String(status || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  }

  function isHosRiskAlertStatus(status) {
    const normalized = normalizeHosStatus(status);
    return normalized === "d" || normalized === "driving" || normalized === "on" || normalized === "onduty";
  }

  function parseHosMinutes(value) {
    const text = String(value || "").trim();
    if (!text || text === "-") return null;
    const match = text.match(/^(-?\d+):(\d{2})$/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  }

  function hosMinutesFromValue(value) {
    const minutes = parseDisplayToMinutes(value);
    return Number.isFinite(minutes) && minutes !== Number.POSITIVE_INFINITY ? minutes : null;
  }

  function hosRisksFor(driver, maxMinutes = 60) {
    const status = driver.currentStatus || driver.status;
    if (!isHosRiskAlertStatus(status)) return [];
    return [
      ["break", "Break", driver.breakDisplay || driver.breakTime],
      ["driving", "Driving", driver.drivingDisplay || driver.driving],
      ["duty", "Duty", driver.dutyDisplay || driver.duty],
      ["cycle", "Cycle", driver.cycleRemainingDisplay || driver.cycle],
    ]
      .map(([metric, label, value]) => ({
        metric,
        label,
        value: value || "--",
        minutes: hosMinutesFromValue(value),
      }))
      .filter((risk) => risk.minutes !== null && risk.minutes >= 0 && risk.minutes <= maxMinutes)
      .map((risk) => ({
        ...risk,
        tier: risk.minutes <= 30 ? "critical" : "warning",
      }))
      .sort((a, b) => a.minutes - b.minutes);
  }

  function hosRiskDrivers(user) {
    return visibleHosDrivers(user)
      .map((driver) => ({ ...driver, risks: hosRisksFor(driver, 60) }))
      .filter((driver) => driver.risks.length)
      .sort((a, b) => a.risks[0].minutes - b.risks[0].minutes);
  }

  function hosCriticalRiskDrivers(user) {
    return visibleHosDrivers(user)
      .map((driver) => ({ ...driver, risks: hosRisksFor(driver, 30).filter((risk) => risk.tier === "critical") }))
      .filter((driver) => driver.risks.length)
      .sort((a, b) => a.risks[0].minutes - b.risks[0].minutes);
  }

  function hosClearDrivers(user) {
    return visibleHosDrivers(user)
      .map((driver) => ({ ...driver, risks: hosRisksFor(driver) }))
      .filter((driver) => !driver.risks.length);
  }

  function applySearch(rows, keys) {
    const term = searchText.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      keys.some((key) => String(row[key] || "").toLowerCase().includes(term))
    );
  }

function parseDisplayToMinutes(value) {
  if (value == null) return Number.POSITIVE_INFINITY;
  const text = String(value).trim();
  if (!text || text === "--") return Number.POSITIVE_INFINITY;
  if (text.toLowerCase() === "completed") return 0;

  let total = 0;
  const isNegative = text.startsWith("-");
  const hrs = text.match(/(\d+)\s*hrs?/i);
  const mins = text.match(/(\d+)\s*mins?/i);
  if (hrs) total += Number(hrs[1]) * 60;
  if (mins) total += Number(mins[1]);

  const hhmm = text.match(/^-?(\d+):(\d{2})$/);
  if (!hrs && !mins && hhmm) total += Number(hhmm[1]) * 60 + Number(hhmm[2]);

  if (!total) return Number.POSITIVE_INFINITY;
  return isNegative ? -total : total;
}

  function getBarInfo(minutes, maxMinutes, warnOnLow=false, focusLastHour=false) {
    if (!Number.isFinite(minutes)) return { width: 0, cls: 'bar-red' };
    if (minutes < 0) return { width: 100, cls: 'bar-red' };
    const scaleMinutes = focusLastHour && minutes <= 60 ? 60 : maxMinutes;
    const pct = Math.max(0, Math.min(100, (minutes / scaleMinutes) * 100));
    let cls = 'bar-green';
    if (warnOnLow && minutes <= 60) cls = 'bar-orange';
    return { width: pct, cls };
  }

  function getReverseBarInfo(minutesRemaining, maxMinutes) {
    if (!Number.isFinite(minutesRemaining)) return { width: 0, cls: 'bar-red' };
    if (minutesRemaining <= 0) return { width: 100, cls: 'bar-green' };
    const completed = Math.max(0, maxMinutes - minutesRemaining);
    const pct = Math.max(0, Math.min(100, (completed / maxMinutes) * 100));
    return { width: pct, cls: 'bar-green' };
  }

  function formatDateForSelectedTimeZone(value, fallback="--") {
    if (!value) return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;
    const options = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    };
    if (ownerHosSelectedTimeZone) options.timeZone = ownerHosSelectedTimeZone;
    return date.toLocaleString("en-US", options);
  }

  function displayStatus(status) {
    const text = String(status || "").trim().toUpperCase();
    if (text === "D") return "Driving";
    if (text === "ON") return "On Duty";
    if (text === "OFF") return "Off Duty";
    if (text === "SB") return "Sleeper";
    if (text === "PC") return "Personal";
    if (text === "YM") return "Yard Move";
    return status || "Unknown";
  }
// Normalize any status string to a short code: "ON", "D", "OFF", "SB", "PC", "YM"
function normalizeHosStatusInput(rawStatus) {
  const cleaned = String(rawStatus || "").trim().toUpperCase();
  const map = {
    "ON DUTY": "ON",
    "DRIVING": "D",
    "OFF DUTY": "OFF",
    "OFF": "OFF",
    "SLEEPER": "SB",
    "SB": "SB",
    "PERSONAL": "PC",
    "PC": "PC",
    "YARD MOVE": "YM",
    "YM": "YM",
    "ERROR": "ERROR",
    "NO LOGS": "NO LOGS"
  };
  return map[cleaned] || cleaned; // fallback to original if unknown
}
  function statusClassName(status) {
    const text = String(status || "").trim().toUpperCase();
    if (text === "OFF") return "status-off";
    if (text === "SB") return "status-sb";
    if (text === "ERROR") return "status-error";
    if (text === "NO LOGS") return "status-nologs";
    return "status-active";
  }

  function formatLowMinuteCountdown(displayValue, minutes, compactWhenLow=false) {
    if (!compactWhenLow || !Number.isFinite(minutes) || minutes < 0 || minutes > 60) return displayValue;
    const safe = Math.max(0, Math.floor(minutes));
    return `00:${String(safe).padStart(2, "0")}`;
  }

  function renderOwnerHosMetric(displayValue, maxMinutes, label, reverse=false, warnOnLow=false, compactWhenLow=false, focusLastHour=false) {
const minutes = parseDisplayToMinutes(displayValue, maxMinutes);    const hasValue = Number.isFinite(minutes) && displayValue !== "--";
    const bar = hasValue
      ? (reverse ? getReverseBarInfo(minutes, maxMinutes) : getBarInfo(minutes, maxMinutes, warnOnLow, focusLastHour))
      : { width: 0, cls: "bar-red" };
    const shown = hasValue ? formatLowMinuteCountdown(displayValue, minutes, compactWhenLow) : "--";
    const isWarning = hasValue && !reverse && warnOnLow && minutes <= 60 && minutes >= 0;
    const isViolation = hasValue && !reverse && minutes < 0;

    return `
      <td>
        <div class="hos-metric ${isWarning ? "warning" : ""} ${isViolation ? "violation" : ""}">
          <div class="bar-track"><div class="bar-fill ${bar.cls}" style="width:${bar.width}%"></div></div>
          <div class="hos-metric-value">${escapeHtml(shown)}</div>
          <div class="hos-metric-label">${escapeHtml(label)}</div>
        </div>
      </td>
    `;
  }

  function getHosSummaryCounts(drivers) {
    const ready14 = (drivers || []).filter(driver => {
      const cycleMinutes = parseDisplayToMinutes(driver.cycleRemainingDisplay);
      return driver.readiness === "READY" && Number.isFinite(cycleMinutes) && cycleMinutes >= 14 * 60;
    }).length;
    const ready28 = (drivers || []).filter(driver => {
      const cycleMinutes = parseDisplayToMinutes(driver.cycleRemainingDisplay);
      return driver.readiness === "READY" && Number.isFinite(cycleMinutes) && cycleMinutes >= 28 * 60;
    }).length;
    const reset10 = (drivers || []).filter(driver => driver.readiness === "NOT READY").length;
    return { ready14, ready28, reset10 };
  }

  function readinessPillClass(readiness) {
    const key = String(readiness || "").replace(/\s+/g, "-").toUpperCase();
    if (key === "READY") return "readiness-READY";
    if (key === "NOT-READY") return "readiness-NOT-READY";
    return "readiness-NO-LOGS";
  }

  function getGeotabDriverRiskInfo(driver) {
    const onDuty = driver.currentStatus === "ON" || driver.currentStatus === "D";
    if (!onDuty) return { level: "clear", lowest: null, label: null };
    const checks = [
      ["Break", driver.breakDisplay],
      ["Drive", driver.drivingDisplay],
      ["Shift", driver.workdayDisplay],
      ["Cycle", driver.cycleRemainingDisplay],
    ];
    let lowest = Number.POSITIVE_INFINITY;
    let label = null;
    for (const [metricLabel, display] of checks) {
      const mins = parseDisplayToMinutes(display);
      if (Number.isFinite(mins) && mins >= 0 && mins < lowest) {
        lowest = mins;
        label = metricLabel;
      }
    }
    if (!Number.isFinite(lowest) || lowest > 60) {
      return { level: "clear", lowest: lowest === Number.POSITIVE_INFINITY ? null : lowest, label };
    }
    if (lowest <= 15) return { level: "critical", lowest, label };
    if (lowest <= 30) return { level: "warning", lowest, label };
    return { level: "caution", lowest, label };
  }

  function countHosAtRisk(drivers) {
    return (drivers || []).filter((driver) => {
      const risk = getGeotabDriverRiskInfo(driver);
      return risk.level === "critical" || risk.level === "warning";
    }).length;
  }

  function renderReadinessPill(readiness) {
    return `<span class="readiness-pill ${readinessPillClass(readiness)}">${escapeHtml(readiness || "Unknown")}</span>`;
  }

  function hosDriverMatchesSearch(driver, query) {
    if (!query) return true;
    const haystack = [
      driver.driverName,
      driver.currentStatus,
      displayStatus(driver.currentStatus),
      driver.readiness,
      driver.vehicle,
    ].map((value) => String(value || "").toLowerCase());
    return haystack.some((value) => value.includes(query));
  }

  function hosMetricMinutes(driver, field) {
    const value = driver[field];
    const minutes = parseDisplayToMinutes(value);
    return Number.isFinite(minutes) ? minutes : Number.POSITIVE_INFINITY;
  }

  function sortHosDrivers(drivers) {
    const dir = ownerHosSortDir === "desc" ? -1 : 1;

    if (ownerHosSortColumn) {
      const column = ownerHosSortColumn;
      return [...drivers].sort((a, b) => {
        if (column === "driver") {
          return dir * String(a.driverName || "").localeCompare(String(b.driverName || ""));
        }
        if (column === "risk") {
          const aRisk = getGeotabDriverRiskInfo(a);
          const bRisk = getGeotabDriverRiskInfo(b);
          const rank = { critical: 0, warning: 1, caution: 2, clear: 3 };
          const rankDiff = (rank[aRisk.level] ?? 9) - (rank[bRisk.level] ?? 9);
          if (rankDiff !== 0) return dir * rankDiff;
          const aLow = aRisk.lowest ?? Number.POSITIVE_INFINITY;
          const bLow = bRisk.lowest ?? Number.POSITIVE_INFINITY;
          return dir * (aLow - bLow);
        }
        const fieldMap = {
          break: "breakDisplay",
          driving: "drivingDisplay",
          workday: "workdayDisplay",
          cycle: "cycleRemainingDisplay",
          remaining: "remainingDisplay",
          cycleReset: "cycleResetDisplay",
          cycleTomorrow: "cycleTomorrowDisplay",
        };
        const field = fieldMap[column];
        if (!field) return 0;
        return dir * (hosMetricMinutes(a, field) - hosMetricMinutes(b, field));
      });
    }

    function onDutyRank(driver) {
      if (driver.currentStatus === "D") return 0;
      if (driver.currentStatus === "ON") return 1;
      return 2;
    }

    const sort = ownerHosSortFilter;
    if (sort === "nameAsc") {
      return [...drivers].sort((a, b) => String(a.driverName || "").localeCompare(String(b.driverName || "")));
    }
    if (sort === "nameDesc") {
      return [...drivers].sort((a, b) => String(b.driverName || "").localeCompare(String(a.driverName || "")));
    }
    if (sort === "onDutyFirst") {
      return [...drivers].sort((a, b) => {
        const rankDiff = onDutyRank(a) - onDutyRank(b);
        if (rankDiff !== 0) return rankDiff;
        return String(a.driverName || "").localeCompare(String(b.driverName || ""));
      });
    }
    if (sort === "cycleAsc") {
      return [...drivers].sort((a, b) => hosMetricMinutes(a, "cycleRemainingDisplay") - hosMetricMinutes(b, "cycleRemainingDisplay"));
    }
    if (sort === "cycleDesc") {
      return [...drivers].sort((a, b) => hosMetricMinutes(b, "cycleRemainingDisplay") - hosMetricMinutes(a, "cycleRemainingDisplay"));
    }
    if (sort === "violationRisk") {
      return [...drivers].sort((a, b) => {
        const aRisk = getGeotabDriverRiskInfo(a);
        const bRisk = getGeotabDriverRiskInfo(b);
        const rank = { critical: 0, warning: 1, caution: 2, clear: 3 };
        const rankDiff = (rank[aRisk.level] ?? 9) - (rank[bRisk.level] ?? 9);
        if (rankDiff !== 0) return rankDiff;
        return (aRisk.lowest ?? Number.POSITIVE_INFINITY) - (bRisk.lowest ?? Number.POSITIVE_INFINITY);
      });
    }
    return drivers;
  }

  function renderHosSortTh(column, label) {
    const active = ownerHosSortColumn === column;
    const indicator = active ? (ownerHosSortDir === "asc" ? "▲" : "▼") : "↕";
    return `<th class="hos-th-sortable${active ? " is-sorted" : ""}" data-hos-sort="${column}" scope="col" aria-sort="${active ? (ownerHosSortDir === "asc" ? "ascending" : "descending") : "none"}"><button type="button" class="hos-th-sort-btn"><span>${escapeHtml(label)}</span><span class="hos-sort-indicator" aria-hidden="true">${indicator}</span></button></th>`;
  }

function renderHosControlsBar(filteredCount, totalCount, summaryHTML = "") {
  const mobile = window.innerWidth <= 768; // approximate mobile breakpoint
  const filtersContent = `
    <div class="hos-controls-body-inner">
      <div class="hos-controls-search">
        <label class="hos-controls-label" for="hosSearchInput">Search drivers</label>
        <input id="hosSearchInput" data-hos-search type="search" placeholder="Name, status, readiness…" value="${escapeHtml(ownerHosSearchText)}" class="toolbar-input hos-search-input" />
      </div>
      <div class="hos-controls-filters">
        <div class="toolbar-group">
          <label class="toolbar-label" for="hosStatusFilter">Status</label>
          <select id="hosStatusFilter" data-owner-hos-change data-hos-field="status" class="toolbar-input">
            <option value="">All statuses</option>
            <option value="ON" ${ownerHosStatusFilter === "ON" ? "selected" : ""}>On Duty</option>
            <option value="D"  ${ownerHosStatusFilter === "D"  ? "selected" : ""}>Driving</option>
            <option value="OFF" ${ownerHosStatusFilter === "OFF" ? "selected" : ""}>Off Duty</option>
            <option value="SB" ${ownerHosStatusFilter === "SB" ? "selected" : ""}>Sleeper</option>
            <option value="YM" ${ownerHosStatusFilter === "YM" ? "selected" : ""}>Yard Move</option>
          </select>
        </div>
        <div class="toolbar-group">
          <label class="toolbar-label" for="hosSortFilter">Sort</label>
          <select id="hosSortFilter" data-owner-hos-change data-hos-field="sort" class="toolbar-input">
            <option value="onDutyFirst"   ${ownerHosSortFilter === "onDutyFirst" && !ownerHosSortColumn ? "selected" : ""}>On duty first</option>
            <option value="nameAsc"       ${ownerHosSortFilter === "nameAsc" && !ownerHosSortColumn ? "selected" : ""}>Name A–Z</option>
            <option value="nameDesc"      ${ownerHosSortFilter === "nameDesc" && !ownerHosSortColumn ? "selected" : ""}>Name Z–A</option>
            <option value="violationRisk" ${ownerHosSortFilter === "violationRisk" && !ownerHosSortColumn ? "selected" : ""}>Risk first</option>
            <option value="cycleAsc"      ${ownerHosSortFilter === "cycleAsc" && !ownerHosSortColumn ? "selected" : ""}>Cycle remaining ↑</option>
            <option value="cycleDesc"     ${ownerHosSortFilter === "cycleDesc" && !ownerHosSortColumn ? "selected" : ""}>Cycle remaining ↓</option>
          </select>
        </div>
      </div>
      <div class="hos-controls-meta">
        <span class="hos-controls-count">${filteredCount} of ${totalCount} drivers</span>
        ${ownerHosSearchText || ownerHosStatusFilter || ownerHosQuickReadiness ? `<button type="button" class="btn btn-secondary btn-compact" data-action="hos-clear-filters">Clear</button>` : ""}
      </div>
    </div>
  `;

  // Desktop: inline controls (always visible)
  if (!mobile) {
    return `
      <div class="hos-controls-bar hos-controls-bar--desktop">
        ${filtersContent}
      </div>
    `;
  }

  // Mobile: button + optional overlay
  return `
    <div class="hos-controls-bar hos-controls-bar--mobile">
      <button type="button" class="btn btn-secondary hos-filters-toggle" data-action="hos-open-filters">
        <span>🔍 Filters & Sort</span>
      </button>
      ${hosFiltersOpen ? `
        <div class="hos-filters-overlay" id="hosFiltersOverlay">
          <div class="hos-filters-overlay-header">
            <h2>Filters & Sort</h2>
            <button class="btn btn-small btn-secondary" type="button" data-action="hos-close-filters">✕ Close</button>
          </div>
          <div class="hos-filters-overlay-body">
            ${summaryHTML}
            ${filtersContent}
          </div>
          <div class="hos-filters-overlay-footer">
            <button class="btn btn-primary" type="button" data-action="hos-close-filters">Apply & Close</button>
          </div>
        </div>
      ` : ""}
    </div>
  `;
}
  function getFilteredHosDrivers(drivers) {
    const q = ownerHosSearchText.trim().toLowerCase();
    const status = ownerHosStatusFilter;

    let filtered = drivers.filter(driver => {
      const matchesSearch = hosDriverMatchesSearch(driver, q);
      const matchesStatus = !status || String(driver.currentStatus || "").toUpperCase() === status;
      let matchesReadiness = true;
      const cycleMinutes = parseDisplayToMinutes(driver.cycleRemainingDisplay);
      if (ownerHosQuickReadiness === "READY14") matchesReadiness = driver.readiness === "READY" && Number.isFinite(cycleMinutes) && cycleMinutes >= 14 * 60;
      else if (ownerHosQuickReadiness === "READY28") matchesReadiness = driver.readiness === "READY" && Number.isFinite(cycleMinutes) && cycleMinutes >= 28 * 60;
      else if (ownerHosQuickReadiness === "RESET10") matchesReadiness = driver.readiness === "NOT READY";
      else if (ownerHosQuickReadiness === "NOLOGS") matchesReadiness = driver.readiness === "NO LOGS";
      else if (ownerHosQuickReadiness === "ONDUTY") matchesReadiness = driver.currentStatus === "ON" || driver.currentStatus === "D";
      return matchesSearch && matchesStatus && matchesReadiness;
    });

    return sortHosDrivers(filtered);
  }

  function renderHosRows(drivers) {
    if (!drivers.length) {
      return `<tr class="hos-empty-row"><td colspan="8">No matching drivers.</td></tr>`;
    }
    return drivers.map(driver => {
      const risk = getGeotabDriverRiskInfo(driver);
      const rowClass = driver.readiness === "READY" ? "row-READY" : driver.readiness === "NOT READY" ? "row-NOTREADY" : "row-NOLOGS";
      const riskBadge = risk.level === "critical"
        ? `<span class="hos-risk-badge critical">⚠ ${risk.lowest}m on ${escapeHtml(risk.label)}</span>`
        : risk.level === "warning"
          ? `<span class="hos-risk-badge warning">⚡ ${risk.lowest}m on ${escapeHtml(risk.label)}</span>`
          : "";
      return `
      <tr class="${rowClass} hos-row--${risk.level}">
        <td class="hos-driver-cell">
          <div class="hos-driver-identity">
            <div class="hos-driver-avatar ${risk.level}">${escapeHtml((driver.driverName || "?")[0].toUpperCase())}</div>
            <div class="hos-driver-meta">
              <div class="hos-driver-name-row">
                <div class="driver-name">${escapeHtml(driver.driverName)}</div>
                ${renderReadinessPill(driver.readiness)}
              </div>
              <div class="driver-subline">
                <span class="status-pill ${statusClassName(driver.currentStatus)}">${escapeHtml(displayStatus(driver.currentStatus))}</span>
                ${driver.statusSinceIso ? `<span class="status-since" title="Last duty-status change recorded by Geotab">since ${escapeHtml(formatDateForSelectedTimeZone(driver.statusSinceIso, driver.statusSinceDisplay || "--"))}</span>` : ""}
                ${riskBadge}
              </div>
              <div class="last-reset-line"><span>Last reset</span> <time>${escapeHtml(formatDateForSelectedTimeZone(driver.lastStatusChange, driver.lastStatusChange || "--"))}</time></div>
            </div>
          </div>
        </td>
        ${renderOwnerHosMetric(driver.breakDisplay, 8 * 60, driver.currentStatus === "ON" ? "30 min break" : "Until break", false, true)}
        ${renderOwnerHosMetric(driver.drivingDisplay, 11 * 60, "Drive", false, true, true, true)}
        ${renderOwnerHosMetric(driver.workdayDisplay, 14 * 60, "Shift", false, true, true, true)}
        ${renderOwnerHosMetric(driver.cycleRemainingDisplay, 70 * 60, "Cycle", false, true, true, true)}
        ${renderOwnerHosMetric(driver.remainingDisplay, 10 * 60, "10h reset", true)}
        ${renderOwnerHosMetric(driver.cycleResetDisplay, 34 * 60, "Cycle reset", true)}
      </tr>
    `;
    }).join("");
  }

  function metricsFor(user) {
    const recaps = visibleRecaps(user);
    const shifts = visibleShifts(user);
    const openIssues = recaps.filter((row) => row.issues || row.lateFirstStop || missingRequired(row).length > 0).length;
    const completed = recaps.filter((row) => row.status === "Completed").length;
    const coverage = shifts.filter((row) => row.assignedDispatcherId).length;
    return {
      activeTrips: recaps.filter((row) => row.status !== "Completed").length,
      openIssues,
      completed,
      coverage,
      shifts: shifts.length,
      hosRisks: hosRiskDrivers(user).length,
    };
  }

  function renderAdminDashboard(user) {
    const metrics = metricsFor(user);
    const issueRows = visibleRecaps(user).filter((row) => row.issues || missingRequired(row).length > 0 || row.lateFirstStop);
    return `
      <div class="section-title">
        <div>
          <h2>NDK command center</h2>
          <p>Live operating view for shifts, coverage, recap quality, and owner visibility.</p>
        </div>
        <div class="actions-row">
          <button class="btn btn-primary" type="button" data-view="recap">Open recap</button>
          <button class="btn btn-secondary" type="button" data-view="users">Manage users</button>
        </div>
      </div>

      ${renderMetricCards([
      ["Active trips", metrics.activeTrips, "Trips still in progress or upcoming"],
      ["Open issues", metrics.openIssues, "Rows needing dispatcher attention"],
      ["Assigned shifts", `${metrics.coverage}/${metrics.shifts}`, "Coverage across today's desks"],
      ["Clients", state.clients.filter((client) => client.active).length, "Active owner accounts"],
    ])}

      <div class="grid-2">
        <div class="panel">
          <div class="panel-header">
            <div>
              <h3>Live trips</h3>
              <p>Current recap rows across all clients.</p>
            </div>
            <span class="pill green">Operational</span>
          </div>
          <div class="panel-body">${renderSimpleRecapTable(visibleRecaps(user).slice(0, 6), false)}</div>
        </div>

        <div class="stack">
          <div class="panel">
            <div class="panel-header">
              <div>
                <h3>Amazon Relay Late Drivers</h3>
                <p>Live late driver.</p>
              </div>
              <span class="pill ${(state.lateItems && state.lateItems.length) ? "amber" : "green"}">${(state.lateItems && state.lateItems.length) ? `${state.lateItems.length} late` : "Clear"}</span>
            </div>
            <div class="panel-body">${renderLateItemsCards(state.lateItems || [])}</div>
          </div>
          <div class="panel">
            <div class="panel-header">
              <div>
                <h3>Issue queue</h3>
                <p>Missing data and comments from the daily recap.</p>
              </div>
              <span class="pill amber">${issueRows.length} open</span>
            </div>
            <div class="panel-body">${renderIssueList(issueRows)}</div>
          </div>
          <div class="panel">
            <div class="panel-header">
              <div>
                <h3>Audit trail</h3>
                <p>Recent management actions.</p>
              </div>
            </div>
            <div class="panel-body">
              <div class="mini-list">
                ${state.audit.map((item) => `<div class="mini-item"><div><strong>${escapeHtml(item)}</strong><span>Today</span></div><span class="pill gray">Log</span></div>`).join("")}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderOwnerOverview(user) {
    const metrics = metricsFor(user);
    const rows = visibleRecaps(user);
    return `
      <div class="section-title">
        <div>
          <h2>${escapeHtml(clientName(user.clientId))}</h2>
          <p>Owner access shows shifts, daily recap status, open issues, and dispatcher coverage for your account.</p>
        </div>
        <div class="actions-row">
          <button class="btn btn-primary" type="button" data-view="owner-recap">Review daily recap</button>
        </div>
      </div>

      ${renderMetricCards([
      ["Active trips", metrics.activeTrips, "Live or upcoming rows"],
      ["Open issues", metrics.openIssues, "Rows that need follow-up"],
      ["Completed", metrics.completed, "Closed recap rows"]
    ])}

      <div class="grid-2">
        <div class="panel">
          <div class="panel-header">
            <div>
              <h3>Daily recap snapshot</h3>
              <p>Read-only owner view with the latest trip status.</p>
            </div>
          </div>
          <div class="panel-body">${renderSimpleRecapTable(rows, false)}</div>
        </div>
        <div class="panel">
          <div class="panel-header">
            <div>
              <h3>Open follow-ups</h3>
              <p>Items that need dispatcher or manager attention.</p>
            </div>
          </div>
          <div class="panel-body">${renderIssueList(rows.filter((row) => row.issues || missingRequired(row).length > 0 || row.lateFirstStop))}</div>
        </div>
      </div>
    `;
  }

  function renderOwnerMobileApp(user) {
    const metrics = metricsFor(user);
    const rows = visibleRecaps(user);
    const issueRows = rows.filter((row) => row.issues || missingRequired(row).length > 0 || row.lateFirstStop);
    const riskDrivers = hosRiskDrivers(user);
    const shifts = visibleShifts(user);
    const nextShift = shifts.find((shift) => shift.status === "In Progress") || shifts[0];
    const primaryRisk = riskDrivers[0];
    const day = recapDayDetails(user);
    const riskLevel = primaryRisk ? (primaryRisk.risks[0]?.minutes <= 15 ? 'critical' : 'warning') : 'clear';

    return `
      <div class="owner-mobile-app">

        <!-- HERO / SAFETY STATUS -->
        <section class="mobile-hero mobile-hero--${riskLevel}">
          <div class="mobile-hero-content">
            <div class="mobile-hero-left">
              <div class="mobile-hero-badge">
                <span class="mobile-hero-badge-dot ${riskLevel}"></span>
                <span>${escapeHtml(clientName(user.clientId))}</span>
              </div>
              <h2 class="mobile-hero-title">Home</h2>
              <p class="mobile-hero-sub">${primaryRisk
                ? `<span class="hero-alert-name">${escapeHtml(primaryRisk.driverName)}</span> needs HOS attention.`
                : 'All drivers within safe HOS limits.'}</p>
              <div class="mobile-hero-actions">
                <button class="mhero-btn mhero-btn--primary" type="button" data-action="enable-owner-notifications">${escapeHtml(ownerNotificationButtonLabel())}</button>
                <button class="mhero-btn mhero-btn--ghost" type="button" data-view="owner-hos">HOS risks ›</button>
                ${installPromptEvent ? `<button class="mhero-btn mhero-btn--ghost" type="button" data-action="install-owner-app">Install app</button>` : ''}
              </div>
            </div>
          </div>
        </section>

        <!-- KPI STRIP - interactive quick nav -->
        <div class="mobile-kpi-strip">
          <button class="kpi-card kpi-card--risk" type="button" data-view="owner-hos" aria-label="View HOS risks">
            <span class="kpi-icon">⚠</span>
            <strong class="kpi-value ${riskDrivers.length > 0 ? 'kpi-red' : 'kpi-green'}">${riskDrivers.length}</strong>
            <span class="kpi-label">HOS Risks</span>
          </button>
          <button class="kpi-card kpi-card--trips" type="button" data-view="owner-recap" aria-label="View daily recap">
            <span class="kpi-icon">🚛</span>
            <strong class="kpi-value">${metrics.activeTrips}</strong>
            <span class="kpi-label">Active Trips</span>
          </button>
          <button class="kpi-card kpi-card--netradyne" type="button" data-view="netradyne-dashboard" aria-label="View Netradyne alerts">
            <span class="kpi-icon">🔔</span>
            <strong class="kpi-value">${netradyneAlerts.length}</strong>
            <span class="kpi-label">Safety Alerts</span>
          </button>
          <button class="kpi-card kpi-card--trucks" type="button" data-view="truck-tracker" aria-label="View down trucks">
            <span class="kpi-icon">🔧</span>
            <strong class="kpi-value ${downTrucks.length > 0 ? 'kpi-amber' : 'kpi-green'}">${downTrucks.length}</strong>
            <span class="kpi-label">Down Trucks</span>
          </button>
        </div>

        <!-- HOS RISK BOARD -->
        <section class="mobile-section">
          <div class="mobile-section-head">
            <div class="section-head-text">
              <div class="section-head-icon hos-icon">⏱</div>
              <div>
                <h3>HOS Risk Board</h3>
                <p>Driving & on-duty drivers approaching limits.</p>
              </div>
            </div>
            <span class="status-pill-badge ${riskDrivers.length ? 'badge-red' : 'badge-green'}">${riskDrivers.length ? `${riskDrivers.length} at risk` : '✓ Clear'}</span>
          </div>
          ${renderHosRiskCards(riskDrivers.slice(0, 3))}
        </section>

      </div>
    `;
  }

function renderOwnerHosMobileCard(driver) {
  const risk = getGeotabDriverRiskInfo(driver);
  const rowClass = driver.readiness === "READY" ? "row-READY" : driver.readiness === "NOT READY" ? "row-NOTREADY" : "row-NOLOGS";
  const riskAlert = risk.level === "critical" || risk.level === "warning"
    ? `<div class="hos-mobile-risk-alert ${risk.level}">${risk.level === "critical" ? "⚠" : "⚡"} ${escapeHtml(risk.label)} — ${risk.lowest}m left</div>`
    : "";
  return `
    <article class="hos-mobile-card ${rowClass} hos-mobile-card--${risk.level}">
      <div class="hos-mobile-card-header">
        <div class="hos-mobile-card-identity">
          <div class="hos-driver-avatar ${risk.level}">${escapeHtml((driver.driverName || "?")[0].toUpperCase())}</div>
          <div>
            <div class="driver-name">${escapeHtml(driver.driverName)}</div>
            <div class="hos-mobile-status-row">
              <span class="status-pill ${statusClassName(driver.currentStatus)}">${escapeHtml(displayStatus(driver.currentStatus))}</span>
            </div>
          </div>
        </div>
        ${renderReadinessPill(driver.readiness)}
      </div>
      ${riskAlert}
      <div class="hos-mobile-reset-row">
        <span class="last-reset-label">Last reset</span>
        <span class="last-reset">${escapeHtml(formatDateForSelectedTimeZone(driver.lastStatusChange, driver.lastStatusChange || "--"))}</span>
      </div>
      <div class="hos-mobile-metrics">
        ${renderHosMetricDiv(driver.breakDisplay, 8*60, 'Break', false, true)}
        ${renderHosMetricDiv(driver.drivingDisplay, 11*60, 'Drive', false, true, true, true)}
        ${renderHosMetricDiv(driver.workdayDisplay, 14*60, 'Shift', false, true, true, true)}
        ${renderHosMetricDiv(driver.cycleRemainingDisplay, 70*60, 'Cycle', false, true, true, true)}
        ${renderHosMetricDiv(driver.remainingDisplay, 10*60, '10h Reset', true)}
        ${renderHosMetricDiv(driver.cycleResetDisplay, 34*60, 'Cyc Reset', true)}
      </div>
    </article>
  `;
}

function renderOwnerHosPage(user) {
  const drivers = (state.hosDrivers || []).filter(driver => !driver.clientId || driver.clientId === user.clientId);
  const filteredDrivers = getFilteredHosDrivers(drivers);
  const summary = getHosSummaryCounts(drivers);
  const totalDrivers = ownerHosTotalDrivers || drivers.length;
  const atRiskCount = countHosAtRisk(drivers);
  const bannerLevel = atRiskCount > 0 ? (drivers.some((d) => getGeotabDriverRiskInfo(d).level === "critical") ? "critical" : "warning") : "clear";
const summaryHTML = `
  <div class="hos-summary-grid hos-summary-grid--overlay">
    <button type="button" class="hos-stat-card ${!ownerHosQuickReadiness ? " active" : ""}" data-readiness="">
      <span class="hos-stat-label">Total Drivers</span>
      <strong class="hos-stat-value">${escapeHtml(totalDrivers)}</strong>
    </button>
    <button type="button" class="hos-stat-card hos-stat-card--green${ownerHosQuickReadiness === "READY14" ? " active" : ""}" data-readiness="READY14">
      <span class="hos-stat-label">Ready 14+</span>
      <strong class="hos-stat-value">${escapeHtml(summary.ready14)}</strong>
    </button>
    <button type="button" class="hos-stat-card hos-stat-card--green${ownerHosQuickReadiness === "READY28" ? " active" : ""}" data-readiness="READY28">
      <span class="hos-stat-label">Ready 28+</span>
      <strong class="hos-stat-value">${escapeHtml(summary.ready28)}</strong>
    </button>
    <button type="button" class="hos-stat-card hos-stat-card--red${atRiskCount > 0 ? " has-alert" : ""}${ownerHosQuickReadiness === "ONDUTY" ? " active" : ""}" data-readiness="ONDUTY">
      <span class="hos-stat-label">On Duty Now</span>
      <strong class="hos-stat-value">${escapeHtml(drivers.filter((d) => d.currentStatus === "ON" || d.currentStatus === "D").length)}</strong>
    </button>
  </div>
`;
    return `
    <div class="hos-page">
      <div class="hos-status-banner hos-status-banner--${bannerLevel}">
        <div class="hos-status-banner-content">
          <div class="hos-status-banner-icon">${bannerLevel === "clear" ? "✓" : bannerLevel === "critical" ? "⚠" : "⚡"}</div>
          <div>
            <strong>${bannerLevel === "clear" ? "All drivers within safe limits" : `${atRiskCount} driver${atRiskCount !== 1 ? "s" : ""} approaching HOS limits`}</strong>
            <span>${ownerHosLastGeneratedAt ? `Last updated ${escapeHtml(formatDateForSelectedTimeZone(ownerHosLastGeneratedAt, "--"))}` : "Waiting for live Geotab data"}${ownerHosIsLoading ? " · Refreshing…" : ""}</span>
          </div>
        </div>
      </div>

      ${renderHosControlsBar(filteredDrivers.length, drivers.length, summaryHTML)}

      <div class="hos-summary-grid hos-summary-grid--desktop">
        <button type="button" class="hos-stat-card${!ownerHosQuickReadiness ? " active" : ""}" data-readiness="">
          <span class="hos-stat-label">Total Drivers</span>
          <strong class="hos-stat-value">${escapeHtml(totalDrivers)}</strong>
        </button>
        <button type="button" class="hos-stat-card hos-stat-card--green${ownerHosQuickReadiness === "READY14" ? " active" : ""}" data-readiness="READY14">
          <span class="hos-stat-label">Ready 14+</span>
          <strong class="hos-stat-value">${escapeHtml(summary.ready14)}</strong>
        </button>
        <button type="button" class="hos-stat-card hos-stat-card--green${ownerHosQuickReadiness === "READY28" ? " active" : ""}" data-readiness="READY28">
          <span class="hos-stat-label">Ready 28+</span>
          <strong class="hos-stat-value">${escapeHtml(summary.ready28)}</strong>
        </button>
        <button type="button" class="hos-stat-card hos-stat-card--red${atRiskCount > 0 ? " has-alert" : ""}${ownerHosQuickReadiness === "ONDUTY" ? " active" : ""}" data-readiness="ONDUTY">
          <span class="hos-stat-label">On Duty Now</span>
          <strong class="hos-stat-value">${escapeHtml(drivers.filter((d) => d.currentStatus === "ON" || d.currentStatus === "D").length)}</strong>
        </button>
      </div>

      <div class="hos-table-wrapper${ownerHosIsLoading ? ' is-loading' : ''}">
        <div class="hos-table-scroll">
          <table class="hos-table-desktop">
            <thead>
              <tr>
                ${renderHosSortTh("driver", "Driver")}
                ${renderHosSortTh("break", "Break")}
                ${renderHosSortTh("driving", "Drive")}
                ${renderHosSortTh("workday", "Shift")}
                ${renderHosSortTh("cycle", "Cycle")}
                ${renderHosSortTh("remaining", "10h Reset")}
                ${renderHosSortTh("cycleReset", "Cyc Reset")}
              </tr>
            </thead>
            <tbody>
              ${renderHosRows(filteredDrivers)}
            </tbody>
          </table>
        </div>

        <div class="hos-mobile-cards">
          ${filteredDrivers.length ? filteredDrivers.map((driver) => renderOwnerHosMobileCard(driver)).join("") : ""}
        </div>
      </div>

      <div class="hos-empty-state" style="display:${filteredDrivers.length ? 'none' : 'flex'}">
        <span class="hos-empty-icon">🔍</span>
        <strong>No matching drivers</strong>
        <p>Try clearing filters or refreshing from Geotab.</p>
        <button class="btn btn-secondary" type="button" data-action="hos-clear-filters">Clear filters</button>
      </div>
    </div>
  `;
}

// ---------- NEW HELPER: returns a plain <div> (for mobile cards) ----------
function renderHosMetricDiv(displayValue, maxMinutes, label, reverse=false, warnOnLow=false, compactWhenLow=false, focusLastHour=false) {
const minutes = parseDisplayToMinutes(displayValue, maxMinutes);  const hasValue = Number.isFinite(minutes) && displayValue !== '--';
  const bar = hasValue
    ? (reverse ? getReverseBarInfo(minutes, maxMinutes) : getBarInfo(minutes, maxMinutes, warnOnLow, focusLastHour))
    : { width: 0, cls: 'bar-red' };
  const shown = hasValue ? formatLowMinuteCountdown(displayValue, minutes, compactWhenLow) : '--';
  return `
    <div class="hos-metric">
      <div class="bar-track"><div class="bar-fill ${bar.cls}" style="width:${bar.width}%"></div></div>
      <div class="hos-metric-value">${escapeHtml(shown)}</div>
      <div class="hos-metric-label">${escapeHtml(label)}</div>
    </div>
  `;
}
  function renderDispatcherHome(user) {
    const myShifts = visibleShifts(user).filter((shift) => shift.assignedDispatcherId === user.id);
    const currentShift = myShifts.find((shift) => shift.status === "In Progress") || myShifts[0];
    const myRows = state.recaps.filter((row) => row.assignedDispatcherId === user.id);
    return `
      <div class="section-title">
        <div>
          <h2>My shift desk</h2>
          <p>Take over assigned coverage, update the recap, and copy starting messages for drivers.</p>
        </div>
        <div class="actions-row">
          <button class="btn btn-primary" type="button" data-view="dispatcher-recap">Open daily recap</button>
          <button class="btn btn-secondary" type="button" data-view="takeover">Takeover board</button>
        </div>
      </div>

      ${renderMetricCards([
      ["Assigned rows", myRows.length, "Daily recap rows on your desk"],
      ["Open issues", myRows.filter((row) => row.issues || missingRequired(row).length > 0).length, "Need update before handoff"],
      ["Shift status", currentShift ? currentShift.status : "Open", "Current desk state"],
      ["Messages", myRows.length, "Starting messages ready to copy"],
    ])}

      <div class="grid-2">
        <div class="stack">
          ${currentShift ? renderCurrentShiftCard(currentShift, user) : `<div class="empty-state">No shift assigned yet.</div>`}
          <div class="panel">
            <div class="panel-header">
              <div>
                <h3>Assigned recap rows</h3>
                <p>Focused table for your current shift.</p>
              </div>
            </div>
            <div class="panel-body">${renderSimpleRecapTable(myRows, true)}</div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <div>
              <h3>Starting messages</h3>
              <p>Copy driver-ready instructions from each recap row.</p>
            </div>
          </div>
          <div class="panel-body">${renderStartingMessages(myRows)}</div>
        </div>
      </div>
    `;
  }

  function renderCurrentShiftCard(shift, user) {
    const rows = state.recaps.filter((row) => row.shiftId === shift.id);
    return `
      <div class="shift-card">
        <div class="section-title">
          <div>
            <h3>${escapeHtml(shift.desk)}</h3>
            <p>${escapeHtml(clientName(shift.clientId))} · ${escapeHtml(shift.date)} · ${escapeHtml(shift.start)}-${escapeHtml(shift.end)}</p>
          </div>
          ${renderStatusPill(shift.status)}
        </div>
        <div class="shift-meta">
          <div><span>Dispatcher</span><strong>${escapeHtml(userName(shift.assignedDispatcherId))}</strong></div>
          <div><span>Recap rows</span><strong>${rows.length}</strong></div>
          <div><span>Open issues</span><strong>${rows.filter((row) => row.issues || missingRequired(row).length > 0).length}</strong></div>
        </div>
        <div class="timeline">
          <div class="timeline-item">
            <span class="timeline-dot"></span>
            <div><strong>Handoff</strong><span>${escapeHtml(shift.handoff)}</span></div>
          </div>
          <div class="timeline-item">
            <span class="timeline-dot"></span>
            <div><strong>Required before close</strong><span>Final arrival home yard, driver log off, BOL status, and issue comments.</span></div>
          </div>
        </div>
        <div class="actions-row">
          <button class="btn btn-primary" type="button" data-action="take-shift" data-shift-id="${shift.id}">Take over shift</button>
          <button class="btn btn-secondary" type="button" data-view="dispatcher-recap">Update recap</button>
        </div>
      </div>
    `;
  }

  function renderMetricCards(cards) {
    return `
      <div class="stats-grid">
        ${cards
        .map(
          ([label, value, note]) => `
              <div class="stat-card">
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(value)}</strong>
                <p>${escapeHtml(note)}</p>
              </div>
            `
        )
        .join("")}
      </div>
    `;
  }

  function renderHosRiskCards(drivers) {
    if (!drivers.length) {
      return `<div class="mobile-empty-state"><span class="empty-icon">✓</span><p>No drivers are approaching HOS limits right now.</p></div>`;
    }

    return `
      <div class="hos-risk-grid">
        ${drivers.map((driver) => renderHosRiskCard(driver)).join("")}
      </div>
    `;
  }

function renderHosRiskCard(driver) {
  const statusRaw = driver.currentStatus || driver.status || 'Unknown';
  const statusText = {
    ON: 'On Duty', D: 'Driving', OFF: 'Off Duty',
    SB: 'Sleeper', PC: 'Personal', YM: 'Yard Move'
  }[statusRaw] || statusRaw;

  // Updated metrics: Workday replaced by Cycle
  const metrics = [
    { label: 'Break',   field: 'breakDisplay',           max: 8 * 60 },
    { label: 'Driving', field: 'drivingDisplay',         max: 11 * 60 },
    { label: 'Duty',    field: 'dutyDisplay',            max: 14 * 60 },
    { label: 'Cycle',   field: 'cycleRemainingDisplay',  max: 70 * 60 }
  ];

  // Determine overall severity (same logic as before)
  let overallSeverity = 'safe';
  const severityOrder = ['safe', 'caution', 'warning', 'critical'];
  metrics.forEach(m => {
    const val = driver[m.field];
    const mins = parseDisplayToMinutes(val);
    if (mins === Number.POSITIVE_INFINITY) return;
    let sev = 'safe';
    if (mins <= 0) sev = 'critical';
    else if (mins <= 30) sev = 'critical';
    else if (mins <= 60) sev = 'warning';
    else if (mins <= 120) sev = 'caution';
    if (severityOrder.indexOf(sev) > severityOrder.indexOf(overallSeverity)) {
      overallSeverity = sev;
    }
  });

  const riskBadge = overallSeverity === 'critical' ? '⚠ Critical' :
                    overallSeverity === 'warning'  ? '⚡ Warning'  : '';

  return `
    <article class="hos-risk-card-v2 ${overallSeverity}">
      <div class="hrc-header">
        <div class="hrc-identity">
          <div class="hrc-avatar ${overallSeverity}">${escapeHtml((driver.driverName || '?')[0].toUpperCase())}</div>
          <div class="hrc-name-block">
            <strong class="hrc-name">${escapeHtml(driver.driverName)}</strong>
            <span class="hrc-sub">${escapeHtml(driver.vehicle || '')}</span>
          </div>
        </div>
        <div class="hrc-badges">
          ${riskBadge
            ? `<span class="hrc-badge hrc-badge--${overallSeverity}">${riskBadge}</span>`
            : `<span class="hrc-badge hrc-badge--safe">✓ Safe</span>`}
          <span class="hrc-status-pill">${escapeHtml(statusText)}</span>
        </div>
      </div>
      <div class="hrc-metrics">
        ${metrics.map(m => {
          const val = driver[m.field];
          const mins = parseDisplayToMinutes(val);
          const hasData = Number.isFinite(mins);
          const display = hasData ? val : '--';
          let pct = 0, barCls = 'bar-green', textCls = 'green';
          let statusMsg = 'No data';
          if (hasData) {
            pct = Math.min(100, Math.max(0, (mins / m.max) * 100));
            if (mins <= 0) {
              statusMsg = 'Exceeded!';
              barCls = 'bar-red';
              textCls = 'red';
              pct = 0;
            } else if (mins <= 30) {
              statusMsg = `${mins}m left`;
              barCls = 'bar-red';
              textCls = 'red';
            } else if (mins <= 60) {
              statusMsg = `${mins}m left`;
              barCls = 'bar-orange';
              textCls = 'amber';
            } else if (mins <= 120) {
              const h = Math.floor(mins/60), mm = mins%60;
              statusMsg = `${h}:${String(mm).padStart(2,'0')} left`;
              barCls = 'bar-orange';
              textCls = 'amber';
            } else {
              const h = Math.floor(mins/60), mm = mins%60;
              statusMsg = `${h}:${String(mm).padStart(2,'0')} left`;
              barCls = 'bar-green';
              textCls = 'green';
            }
          }
          return `
            <div class="hos-metric-row ${textCls}">
              <span class="hos-metric-label">${escapeHtml(m.label)}</span>
              <div class="hos-metric-bar-wrap">
                <div class="hos-metric-bar" style="width:${pct}%; background:${barCls === 'bar-green' ? 'var(--green)' : barCls === 'bar-orange' ? 'var(--amber)' : 'var(--red)'};"></div>
              </div>
              <span class="hos-metric-value" style="color:var(--${textCls});">${escapeHtml(display)}</span>
              <span class="hos-metric-status" style="color:var(--${textCls}); font-size:11px;">${statusMsg}</span>
            </div>
          `;
        }).join('')}
      </div>
      <div class="hrc-footer">
        <span class="hrc-footer-item hrc-footer-time">Last change: ${escapeHtml(driver.lastStatusChange || '--')}</span>
      </div>
    </article>
  `;
}
  function parseTimeToMinutes(timeStr) {
    if (!timeStr || timeStr === "-") return 0;
    const parts = timeStr.split(":");
    if (parts.length === 2) {
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
    return 0;
  }

  function renderHosMetric(label, value, risky) {
    const minutes = parseTimeToMinutes(value);

    // Calculate max minutes based on label
    let maxMinutes = 480; // Break (8 hrs)
    if (label === "Driving") maxMinutes = 660; // 11 hrs
    if (label === "Duty") maxMinutes = 840; // 14 hrs
    if (label === "Workday" || label === "Cycle") maxMinutes = 4200; // 70 hrs

    // Value represents REMAINING time, so high percentage = safe, low = risk
    let pct = 0;
    let severity = "safe";
    let statusText = "";
    let barColor = "var(--green)";
    let textColor = "var(--green)";

    if (!value || value === "-") {
      severity = "no-data";
      statusText = "No data";
      barColor = "var(--border)";
      textColor = "var(--text-muted)";
      pct = 0;
    } else {
      // Percentage of time remaining (100% = full time left, 0% = exhausted)
      pct = Math.min(100, Math.max(0, (minutes / maxMinutes) * 100));

      if (minutes <= 0) {
        severity = "critical";
        statusText = "Exceeded!";
        barColor = "var(--red)";
        textColor = "var(--red)";
        pct = 0;
      } else if (minutes <= 30) {
        severity = "critical";
        statusText = `${minutes}m left`;
        barColor = "var(--red)";
        textColor = "var(--red)";
      } else if (minutes <= 60) {
        severity = "warning";
        statusText = `${minutes}m left`;
        barColor = "var(--amber)";
        textColor = "var(--amber)";
      } else if (minutes <= 120) {
        severity = "caution";
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        statusText = `${hours}:${String(mins).padStart(2, '0')} left`;
        barColor = "var(--primary)";
        textColor = "var(--primary)";
      } else {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        statusText = `${hours}:${String(mins).padStart(2, '0')} left`;
        barColor = "var(--green)";
        textColor = "var(--green)";
      }
    }

    return `
      <div class="hos-metric-row ${severity}">
        <span class="hos-metric-label">${escapeHtml(label)}</span>
        <div class="hos-metric-bar-wrap">
          <div class="hos-metric-bar" style="width: ${pct}%; background: ${barColor};"></div>
        </div>
        <span class="hos-metric-value" style="color: ${textColor};">${escapeHtml(value || "-")}</span>
        <span class="hos-metric-status" style="color: ${textColor}; font-size: 11px;">${statusText}</span>
      </div>
    `;
  }

  function renderLateItemsCards(items) {
    if (!items || !items.length) return `<div class="mobile-empty-state"><span class="empty-icon">✓</span><p>No late items reported.</p></div>`;
    return `
      <div class="mobile-card-list">
        ${items.map((item) => `
          <div class="late-item-card">
            <div class="lic-header">
              <div class="lic-info">
                <strong class="lic-driver">${escapeHtml(item.driverName)}</strong>
                <span class="lic-vrid">VRID: ${escapeHtml(item.loadId)}</span>
              </div>
              <div class="lic-late-badge">${escapeHtml(item.lateBy)}<span>min late</span></div>
            </div>
            <div class="lic-details">
              <div class="lic-detail-item">
                <span class="lic-detail-label">Scheduled</span>
                <strong>${escapeHtml(item.schStr)}</strong>
              </div>
              <div class="lic-detail-item">
                <span class="lic-detail-label">Actual</span>
                <strong>${escapeHtml(item.actualStr)}</strong>
              </div>
              <div class="lic-detail-item">
                <span class="lic-detail-label">Stop</span>
                <strong>${escapeHtml(item.type)} ${escapeHtml(item.stopNum)}</strong>
              </div>
              <div class="lic-detail-item">
                <span class="lic-detail-label">Delay Reported</span>
                <strong class="${item.delayReasonReported ? 'lic-yes' : 'lic-no'}">${item.delayReasonReported ? 'Yes' : 'No'}</strong>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  function renderHosDriverList(drivers) {
    if (!drivers.length) return `<div class="empty-state">No HOS rows have been scanned yet.</div>`;
    return `
      <div class="hos-cards-stack">
        ${drivers.map((driver) => renderHosRiskCard(driver)).join("")}
      </div>
    `;
  }

function renderMobileRecapCards(rows) {
  if (!rows.length) return `<div class="mobile-empty-state"><span class="empty-icon">📋</span><p>No daily recap rows for this day.</p></div>`;
  return `
    <div class="mobile-card-list">
      ${rows.map((row) => {
      const missing = missingRequired(row);
      const hasIssue = row.issues || missing.length || row.lateFirstStop;
      return `
            <article class="recap-card-v2 ${hasIssue ? 'has-issue' : ''}">
              <div class="rcv-header">
                <div class="rcv-driver">
                  <div class="rcv-avatar">${escapeHtml((row.driverAssigned || 'D')[0].toUpperCase())}</div>
                  <div>
                    <strong class="rcv-name">${escapeHtml(row.driverAssigned)}</strong>
                    <span class="rcv-sub">Truck ${escapeHtml(row.truck || 'TBD')} · ${escapeHtml(row.tripId)}</span>
                  </div>
                </div>
                <div class="rcv-badges">
                  ${renderStatusPill(row.status)}
                  <span class="rcv-issue-badge ${hasIssue ? 'issue' : 'clean'}">${hasIssue ? 'Follow-up' : 'Clean'}</span>
                </div>
              </div>
              <div class="rcv-times">
                <div class="rcv-time-item">
                  <span>Start</span><strong>${escapeHtml(row.requestedStart || '–')}</strong>
                </div>
                <div class="rcv-time-item">
                  <span>Final</span><strong>${escapeHtml(row.scheduledFinal || '–')}</strong>
                </div>
                <div class="rcv-time-item">
                  <span>BOL</span><strong>${escapeHtml(row.bol || '–')}</strong>
                </div>
              </div>
              ${hasIssue ? `<div class="rcv-issue-text">⚠ ${escapeHtml(row.issues || missing.join(', '))}</div>` : ''}
            </article>
          `;
    }).join('')}
    </div>
  `;
}

  function renderOwnerPriorityCards(rows) {
    if (!rows.length) return `<div class="mobile-empty-state"><span class="empty-icon">✓</span><p>No open follow-ups right now.</p></div>`;
    return `
      <div class="mobile-card-list">
        ${rows.map((row) => {
          const issue = row.issues || missingRequired(row).join(', ') || 'Needs review';
          const bolStatus = row.bol || 'Pending';
          return `
          <article class="priority-card-v2">
            <div class="pcv-left">
              <div class="pcv-avatar">${escapeHtml((row.driverAssigned || 'D')[0].toUpperCase())}</div>
              <div class="pcv-body">
                <strong class="pcv-name">${escapeHtml(row.driverAssigned)}</strong>
                <span class="pcv-trip">${escapeHtml(row.tripId)}</span>
                <span class="pcv-issue">⚠ ${escapeHtml(issue)}</span>
              </div>
            </div>
            <div class="pcv-right">
              <span class="pcv-bol ${bolStatus === 'Uploaded' ? 'bol-ok' : 'bol-pending'}">${escapeHtml(bolStatus)}</span>
            </div>
          </article>`;
        }).join('')}
      </div>
    `;
  }

  function renderMobileShiftCards(shifts) {
    if (!shifts.length) return `<div class="mobile-empty-state"><span class="empty-icon">📅</span><p>No shifts scheduled.</p></div>`;
    return `
      <div class="mobile-card-list">
        ${shifts.map((shift) => {
          const dispName = userName(shift.assignedDispatcherId);
          const isActive = shift.status === 'In Progress';
          return `
          <article class="shift-card-v2 ${isActive ? 'shift-active' : ''}">
            <div class="scv-time-block">
              <strong class="scv-time">${escapeHtml(shift.start)}–${escapeHtml(shift.end)}</strong>
              ${renderStatusPill(shift.status)}
            </div>
            <div class="scv-detail">
              <span class="scv-dispatcher">👤 ${escapeHtml(dispName)}</span>
              <span class="scv-handoff">${escapeHtml(shift.handoff || 'No handoff note')}</span>
            </div>
          </article>`;
        }).join('')}
      </div>
    `;
  }

function renderRecapPage(user) {
  const editable = user.role !== "owner";
  const rows = visibleRecaps(user);
  const day = recapDayDetails(user);
  return `
    <div class="section-title">
      <div>
        <h2>Daily Recap</h2>
        <p>Operating table for trip status, time checks, HOS, VRIDs, comments, and starting messages.</p>
      </div>
      <div class="actions-row">
        ${renderRecapTabs(user)}
        <button class="btn btn-secondary" type="button" data-action="recap-print">Export / Print</button>
      </div>
    </div>

    ${renderRecapDayControls(user, editable)}

    <div class="panel">
      <div class="panel-header">
        <div>
          <h3>Daily recap for ${escapeHtml(formatDateLabel(selectedRecapDate))}</h3>
          <p>${rows.length} rows visible - ${day.rowCount} total for this day - source: ${escapeHtml(day.source)}.</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          ${editable ? `<button class="btn btn-primary btn-small" type="button" data-action="recap-add-row">+ Add row</button>` : ""}
          <span class="pill ${editable ? "green" : "blue"}">${editable ? "Editable" : "Owner view"}</span>
        </div>
      </div>
      <div class="panel-body">
        <div class="recap-table-desktop">
          ${renderRecapTable(rows, editable)}
        </div>
        ${renderRecapMobileCards(rows)}
      </div>
    </div>
  `;
}

  function renderRecapDayControls(user, editable) {
    const dates = availableRecapDates(user);
    const adminClientSelect = user.role === "admin"
      ? `
        <label class="field compact-field">
          <span class="field-label">Import client</span>
          <select class="table-control date-select" data-import-client>
            ${state.clients.map((client) => `<option value="${client.id}">${escapeHtml(client.name)}</option>`).join("")}
          </select>
        </label>
      `
      : "";

    return `
      <div class="recap-toolbar">
        <label class="field compact-field">
          <span class="field-label">📅 Pick a date</span>
          <input class="table-control date-select" type="date" data-recap-date-picker value="${escapeHtml(selectedRecapDate)}" />
        </label>
        <button class="btn btn-secondary btn-small" type="button" data-action="recap-today">Today</button>
        <label class="field compact-field" style="flex:1;min-width:160px">
          <span class="field-label">🔎 Search</span>
          <input class="table-control" type="search" data-search placeholder="Driver, trip, block, VRID…" value="${escapeHtml(searchText)}" />
        </label>
        <div class="day-meta">
          <span class="pill blue">${escapeHtml(selectedRecapDate)}</span>
          <span>${escapeHtml(recapDayDetails(user).rowCount)} rows saved for this day</span>
        </div>
        ${editable ? `
          ${adminClientSelect}
          <label class="btn btn-primary file-import">
            Import trips CSV
            <input type="file" accept=".csv,text/csv" data-import-trips />
          </label>
        ` : ""}
      </div>
    `;
  }

  function renderRecapTabs(user) {
    // Owners and dispatchers get a clean recap with no filter tabs.
    if (user.role === "owner" || user.role === "dispatcher") return "";
    const tabs = [
      ["all", "All"],
      ["open", "Open"],
      ["issues", "Issues"],
    ];
    if (user.role === "dispatcher") tabs.splice(1, 0, ["mine", "Mine"]);
    return `
      <div class="tabs">
        ${tabs
        .map(
          ([id, label]) => `
              <button class="tab-btn ${recapFilter === id ? "active" : ""}" type="button" data-filter="${id}">
                ${escapeHtml(label)}
              </button>
            `
        )
        .join("")}
      </div>
    `;
  }

  function renderRecapTable(rows, editable) {
    if (!rows.length) return `<div class="empty-state truck-empty"><div class="truck-empty-icon">📅</div><strong>No data for ${escapeHtml(formatDateLabel(selectedRecapDate))}</strong><p>${searchText.trim() ? "No rows match your search." : (editable ? 'There is no recap for this day. Import a CSV or click "+ Add row" to start one.' : "There is no recap for this day.")}</p></div>`;
    return `
      <div class="table-wrap">
        <table class="recap-table">
          <thead>
            <tr>
              <th class="row-number">#</th>
              <th>Driver Assigned</th>
              <th>Trip Date</th>
              <th>Status</th>
              <th>Trip ID</th>
              <th>Block ID</th>
              <th>VRIDs</th>
              <th>Solo 1 - Solo 2</th>
              <th>Truck</th>
              <th>Fuel</th>
              <th>On Duty Time</th>
              <th>Requested Start</th>
              <th>Stop 1 upcoming</th>
              <th>Scheduled Final</th>
              <th>HOS Check</th>
              <th>Late First Stop?</th>
              <th>Issues / Comments</th>
              <th>Starting Message</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row, index) => renderRecapRow(row, index + 1, editable)).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
function renderRecapMobileCards(rows) {
  if (!rows.length) return `<div class="recap-mobile-cards"><div class="empty-state truck-empty"><div class="truck-empty-icon">📅</div><strong>No data for ${escapeHtml(formatDateLabel(selectedRecapDate))}</strong><p>${searchText.trim() ? "No rows match your search." : "There is no recap for this day."}</p></div></div>`;

  return `
    <div class="recap-mobile-cards">
      ${rows.map(row => {
        const missing = missingRequired(row);
        const driver = row.driverAssigned || 'Unknown';
        const blockId = row.blockId || '–';

        // Determine issue badge
        const hasIssue = (row.issues && row.issues.trim()) || missing.length > 0;

        // Helper to format a field: label + value (with fallback)
        const field = (label, value) => `
          <div class="rcv-detail-row">
            <span>${label}</span>
            <strong>${escapeHtml(value || '–')}</strong>
          </div>`;

        const isExpanded = expandedRecapIds.has(row.id);
        return `
          <article class="recap-card-v2 ${hasIssue ? 'has-issue' : ''}" data-recap-id="${row.id}">
            <div class="rcv-header recap-toggle" data-action="toggle-recap-detail" data-recap-id="${row.id}">
              <div class="rcv-driver">
                <div>
                  <strong class="rcv-name">${escapeHtml(driver)}</strong>
                  <span class="rcv-sub">Block ${escapeHtml(blockId)}</span>
                </div>
              </div>
              <div class="rcv-badges">
                ${renderStatusPill(row.status)}
                <span class="rcv-issue-badge ${hasIssue ? 'issue' : 'clean'}">${hasIssue ? '⚠' : '✓'}</span>
                <span class="rcv-expand-icon">${isExpanded ? '▲' : '▼'}</span>
              </div>
            </div>
            <div class="recap-details" style="display:${isExpanded ? 'grid' : 'none'};">
              ${field('Status', row.status)}
              ${field('Trip ID', row.tripId)}
              ${field('Block ID', row.blockId)}
              ${field('VRIDs', (row.vrids && row.vrids.length) ? row.vrids.join(', ') : '–')}
              ${field('Solo', row.solo)}
              ${field('Truck', row.truck)}
              ${field('Fuel', row.fuel)}
              ${field('On Duty', row.onDuty)}
              ${field('Requested Start', row.requestedStart)}
              ${field('Stop 1 upcoming', row.stopOneupcoming)}
              ${field('Scheduled Final', row.scheduledFinal)}
              ${field('HOS Check', row.hosCheck)}
              ${field('Late First Stop', row.lateFirstStop ? 'Yes' : 'No')}
              ${field('Issues', row.issues || 'None')}
            </div>
          </article>
        `;
      }).join('')}
    </div>
  `;
}
  function renderRecapRow(row, index, editable) {
    const missing = missingRequired(row);
    const control = (field, widthClass) => renderTableControl(row, field, editable, widthClass);
    return `
      <tr>
        <td class="row-number">${index}</td>
        <td class="driver-cell">${control("driverAssigned")}</td>
        <td>${control("tripDate")}</td>
        <td>${editable ? renderSelectControl(row, "status", ["Upcoming", "In Progress", "Completed", "Delayed"]) : renderStatusPill(row.status)}</td>
        <td class="id-cell">${control("tripId")}</td>
        <td class="id-cell">${control("blockId")}</td>
        <td class="vrids">${renderVrids(row, editable)}</td>
        <td>${editable ? renderSelectControl(row, "solo", ["Solo 1", "Solo 2"]) : `<span class="pill blue">${escapeHtml(row.solo)}</span>`}</td>
        <td class="${missing.includes("truck") ? "cell-required" : ""}">${control("truck")}</td>
        <td class="${missing.includes("fuel") ? "cell-required" : ""}">${control("fuel")}</td>
        <td class="${missing.includes("onDuty") ? "cell-required" : ""}">${control("onDuty")}</td>
        <td>${control("requestedStart")}</td>
        <td>${control("stopOneupcoming")}</td>
        <td>${control("scheduledFinal")}</td>
        <td>${editable ? renderSelectControl(row, "hosCheck", ["HOS - Shift Pre Check", "30 Minutes Completed", "Break upcoming", "HOS Risk"]) : `<span class="pill green">${escapeHtml(row.hosCheck)}</span>`}</td>
        <td>${editable ? `<input class="toggle" type="checkbox" data-recap-field="lateFirstStop" data-recap-id="${row.id}" ${row.lateFirstStop ? "checked" : ""} />` : row.lateFirstStop ? `<span class="pill red">Yes</span>` : `<span class="pill gray">No</span>`}</td>
        <td class="${row.issues ? "" : "cell-required"}">${editable ? `<textarea class="table-control" data-recap-field="issues" data-recap-id="${row.id}">${escapeHtml(row.issues)}</textarea>` : `<span class="compact">${escapeHtml(row.issues || "No comments")}</span>`}</td>
        <td><button class="btn btn-primary btn-small" type="button" data-action="copy-starting-message" data-recap-id="${row.id}">Copy message</button></td>
        <td>${editable ? `<button class="btn btn-danger btn-small" type="button" data-action="recap-delete-row" data-recap-id="${row.id}">Delete</button>` : ""}</td>
      </tr>
    `;
  }

  // VRIDs: show ALL of them. Editable = a textarea with one VRID per line (or
  // comma separated); read-only = chips. Never truncated with "+N".
  function renderVrids(row, editable) {
    const items = Array.isArray(row.vrids) ? row.vrids.filter(Boolean) : [];
    if (editable) {
      return `<textarea class="table-control vrid-edit" rows="${Math.max(2, Math.min(items.length, 8))}" data-recap-field="vrids" data-recap-id="${row.id}" placeholder="One VRID per line">${escapeHtml(items.join("\n"))}</textarea>`;
    }
    if (!items.length) return `<span class="muted">No VRIDs</span>`;
    return `<div class="vrid-list">${items.map((vrid) => `<span class="vrid-chip">${escapeHtml(vrid)}</span>`).join("")}</div>`;
  }

  function renderTableControl(row, field, editable) {
    if (!editable) return `<span>${escapeHtml(row[field] || "-")}</span>`;
    return `<input class="table-control" type="text" value="${escapeHtml(row[field])}" data-recap-field="${field}" data-recap-id="${row.id}" />`;
  }

  function renderSelectControl(row, field, options) {
    return `
      <select class="table-control" data-recap-field="${field}" data-recap-id="${row.id}">
        ${options.map((option) => `<option value="${escapeHtml(option)}" ${row[field] === option ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
      </select>
    `;
  }

  function missingRequired(row) {
    return ["truck", "fuel", "onDuty"].filter((field) => !String(row[field] || "").trim());
  }

  function renderStatusPill(status) {
    const className = status === "Completed" ? "green" : status === "In Progress" ? "green" : status === "Delayed" ? "red" : status === "Open" ? "amber" : "blue";
    return `<span class="pill ${className}">${escapeHtml(status)}</span>`;
  }

  function renderSimpleRecapTable(rows, showActions) {
    if (!rows.length) return `<div class="empty-state">No rows yet.</div>`;
    return `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Driver</th>
              <th>Trip</th>
              <th>Block</th>
              <th>Status</th>
              <th>Truck</th>
              <th>Issues</th>
              ${showActions ? "<th>Action</th>" : ""}
            </tr>
          </thead>
          <tbody>
            ${rows
        .map(
          (row) => `
                  <tr>
                    <td class="driver-cell">${escapeHtml(row.driverAssigned)}</td>
                    <td>${escapeHtml(row.tripId)}<br><span class="muted compact">${escapeHtml(row.tripDate)}</span></td>
                    <td>${escapeHtml(row.blockId)}</td>
                    <td>${renderStatusPill(row.status)}</td>
                    <td>${escapeHtml(row.truck || "-")}</td>
                    <td class="compact">${escapeHtml(row.issues || missingRequired(row).join(", ") || "Clean")}</td>
                    ${showActions ? `<td><button class="btn btn-secondary btn-small" type="button" data-view="dispatcher-recap">Edit</button></td>` : ""}
                  </tr>
                `
        )
        .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderIssueList(rows) {
    if (!rows.length) return `<div class="empty-state">No open issues.</div>`;
    return `
      <div class="mini-list">
        ${rows
        .slice(0, 7)
        .map((row) => {
          const missing = missingRequired(row);
          const note = row.issues || (missing.length ? `Missing ${missing.join(", ")}` : "Late to first stop");
          return `
              <div class="mini-item">
                <div>
                  <strong>${escapeHtml(row.driverAssigned)}</strong>
                  <span>${escapeHtml(row.tripId)} · ${escapeHtml(note)}</span>
                </div>
                ${renderStatusPill(row.status)}
              </div>
            `;
        })
        .join("")}
      </div>
    `;
  }

  function renderStartingMessages(rows) {
    if (!rows.length) return `<div class="empty-state">No assigned rows yet.</div>`;
    return `
      <div class="mini-list">
        ${rows
        .map(
          (row) => `
              <div class="mini-item">
                <div>
                  <strong>${escapeHtml(row.driverAssigned)}</strong>
                  <span>${escapeHtml(makeStartingMessage(row))}</span>
                </div>
                <button class="btn btn-primary btn-small" type="button" data-action="copy-starting-message" data-recap-id="${row.id}">Copy</button>
              </div>
            `
        )
        .join("")}
      </div>
    `;
  }

  function makeStartingMessage(row) {
    return `Hello ${row.driverAssigned},  Requested yard time is ${row.requestedStart}, truck ${row.truck || "TBD"}, fuel ${row.fuel || "N/A"}%. Please complete HOS pre-check and DVIR before departure.`;
  }

  // Push recaps to the server right now (structural changes shouldn't wait for
  // the 2s debounce) so add/delete is durable immediately.
  function syncRecapsNow() {
    if (!session) return;
    fetch("/api/recaps/sync", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recaps: state.recaps }),
    }).catch(() => {});
  }

  function recapClientIdFor(user) {
    if (user && user.clientId) return user.clientId;
    if (user && user.role === "admin") {
      return app.querySelector("[data-import-client]")?.value || state.clients[0]?.id || null;
    }
    return state.clients[0]?.id || null;
  }

  function addRecapRow(user) {
    const row = {
      id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      clientId: recapClientIdFor(user),
      dailyDate: selectedRecapDate,
      driverAssigned: "",
      tripDate: selectedRecapDate,
      status: "Upcoming",
      tripId: "",
      blockId: "",
      vrids: [],
      solo: "Solo 1",
      truck: "",
      dvir: "Not Started",
      fuel: "",
      onDuty: "",
      requestedStart: "",
      stopOneupcoming: "",
      scheduledFinal: "",
      hosCheck: "HOS - Shift Pre Check",
      lateFirstStop: false,
      issues: "",
    };
    state.recaps.push(row);
    recapFilter = "all"; // make sure the new blank row is visible
    addAudit(`${user.name} added a recap row for ${selectedRecapDate}.`);
    saveState();
    syncRecapsNow();
    render();
    showToast("Row added.");
  }

  function deleteRecapRow(id) {
    const row = state.recaps.find((r) => r.id === id);
    if (!row) return;
    if (!window.confirm(`Delete this recap row${row.driverAssigned ? ` for ${row.driverAssigned}` : ""}? This cannot be undone.`)) return;
    state.recaps = state.recaps.filter((r) => r.id !== id);
    addAudit(`${getCurrentUser().name} deleted a recap row.`);
    saveState();
    // Explicit server delete (sync only upserts, so it can't remove a row).
    fetch("/api/recaps/delete", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
    render();
    showToast("Row deleted.");
  }

  // Open a clean, printable page of the current day's recap (PDF via the print dialog).
  function exportRecapPrintable(user) {
    const rows = visibleRecaps(user);
    const cols = [
      ["#", (r, i) => i + 1],
      ["Driver", (r) => r.driverAssigned],
      ["Trip Date", (r) => r.tripDate],
      ["Status", (r) => r.status],
      ["Trip ID", (r) => r.tripId],
      ["Block ID", (r) => r.blockId],
      ["VRIDs", (r) => (Array.isArray(r.vrids) ? r.vrids.join(", ") : "")],
      ["Solo", (r) => r.solo],
      ["Truck", (r) => r.truck],
      ["Fuel", (r) => r.fuel],
      ["On Duty", (r) => r.onDuty],
      ["Requested Start", (r) => r.requestedStart],
      ["Stop 1", (r) => r.stopOneupcoming],
      ["Scheduled Final", (r) => r.scheduledFinal],
      ["HOS Check", (r) => r.hosCheck],
      ["Late 1st?", (r) => (r.lateFirstStop ? "Yes" : "No")],
      ["Issues / Comments", (r) => r.issues],
    ];
    const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const head = cols.map(([label]) => `<th>${esc(label)}</th>`).join("");
    const body = rows
      .map((r, i) => `<tr>${cols.map(([, fn]) => `<td>${esc(fn(r, i))}</td>`).join("")}</tr>`)
      .join("");
    const title = `Daily Recap — ${formatDateLabel(selectedRecapDate)}`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;margin:24px;color:#111}
        h1{font-size:18px;margin:0 0 4px} .sub{color:#666;font-size:12px;margin-bottom:16px}
        table{width:100%;border-collapse:collapse;font-size:11px}
        th,td{border:1px solid #bbb;padding:4px 6px;text-align:left;vertical-align:top}
        th{background:#f0f0f0} tr:nth-child(even) td{background:#fafafa}
        @media print{@page{size:landscape;margin:10mm}}
      </style></head><body>
      <h1>${esc(title)}</h1>
      <div class="sub">${rows.length} rows · generated ${esc(new Date().toLocaleString())}</div>
      <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
      </body></html>`;

    // Print through a hidden iframe so the user never leaves the app (opening a
    // new tab on mobile traps them there). The iframe is removed after printing.
    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    document.body.appendChild(frame);
    const cleanup = () => { try { document.body.removeChild(frame); } catch (_) {} };
    frame.onload = () => {
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
      } catch (_) {
        showToast("Could not open the print dialog.");
      }
      // Give the print dialog time to grab the content, then remove the iframe.
      setTimeout(cleanup, 1500);
    };
    const doc = frame.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
  }

  // ---------- Truck Tracker (down trucks) — DB-backed only ----------
  function canEditTrucks(user) {
    // Owners are view-only; dispatchers/managers/admins can add and edit.
    return user && ["dispatcher", "manager", "admin", "superadmin"].includes(user.role);
  }

  const TRUCK_STATUSES = ["Active", "Inactive"];

  function truckStatusPill(status) {
    const s = status || "Active";
    return `<span class="pill ${s === "Inactive" ? "gray" : "amber"}">${escapeHtml(s)}</span>`;
  }

  function visibleTrucks() {
    let rows = downTrucks;
    if (truckStatusFilter !== "all") rows = rows.filter((t) => (t.status || "Active") === truckStatusFilter);
    return applySearch(rows, ["truckNumber", "issue", "woNumber", "status"]);
  }

  function renderTruckTracker(user) {
    const editable = canEditTrucks(user);
    const trucks = visibleTrucks();
    const statuses = ["all", ...TRUCK_STATUSES];
    const header = `
      <div class="section-title">
        <div>
          <h2>Truck Tracker</h2>
          <p>Down trucks: issue, date, and work order (WO).</p>
        </div>
        <div class="actions-row">
          ${editable ? `<button class="btn btn-primary" type="button" data-action="truck-add-row">+ Add truck</button>` : ""}
        </div>
      </div>`;

    // No trucks at all → clean, centered empty state (not a broken table row).
    if (!downTrucks.length) {
      return `
        ${header}
        <div class="panel">
          <div class="panel-body">
            <div class="empty-state truck-empty">
              <div class="truck-empty-icon">🚚</div>
              <strong>No trucks logged</strong>
              <p>${editable ? 'Click "+ Add truck" to log a down truck with its issue and WO number.' : "No down trucks for this account right now."}</p>
            </div>
          </div>
        </div>`;
    }

    return `
      ${header}

      <div class="recap-toolbar">
        <label class="field compact-field" style="flex:1;min-width:150px">
          <span class="field-label">🔎 Search</span>
          <input class="table-control" type="search" data-search placeholder="Truck #, issue, WO…" value="${escapeHtml(searchText)}" />
        </label>
        <label class="field compact-field">
          <span class="field-label">Filter status</span>
          <select class="table-control" data-truck-filter>
            ${statuses.map((s) => `<option value="${s}" ${truckStatusFilter === s ? "selected" : ""}>${s === "all" ? "All" : s}</option>`).join("")}
          </select>
        </label>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div><h3>Down trucks</h3><p>${trucks.length} shown of ${downTrucks.length}.</p></div>
          <span class="pill amber">${downTrucks.length} logged</span>
        </div>
        <div class="panel-body">
          ${trucks.length ? `
          <div class="truck-table-desktop">
            <div class="table-wrap">
              <table class="recap-table truck-table">
                <thead>
                  <tr>
                    <th class="row-number">#</th>
                    <th>Truck #</th>
                    <th>Issue</th>
                    <th>Date</th>
                    <th>WO #</th>
                    <th>Status</th>
                    ${editable ? "<th></th>" : ""}
                  </tr>
                </thead>
                <tbody>${trucks.map((t, i) => renderTruckRow(t, i + 1, editable)).join("")}</tbody>
              </table>
            </div>
          </div>
          ${renderTruckCards(trucks, editable)}
          ` : `<div class="empty-state truck-empty"><strong>No matches</strong><p>No trucks match your search or filter.</p></div>`}
        </div>
      </div>
    `;
  }

  function renderTruckRow(t, index, editable) {
    const inp = (field, type = "text") =>
      editable
        ? `<input class="table-control" type="${type}" value="${escapeHtml(t[field] || "")}" data-truck-field="${field}" data-truck-id="${t.id}" />`
        : `<span>${escapeHtml(t[field] || "-")}</span>`;
    const statusCtl = editable
      ? `<select class="table-control" data-truck-field="status" data-truck-id="${t.id}">
           ${TRUCK_STATUSES.map((s) => `<option value="${s}" ${(t.status || "Active") === s ? "selected" : ""}>${s}</option>`).join("")}
         </select>`
      : truckStatusPill(t.status);
    return `
      <tr>
        <td class="row-number">${index}</td>
        <td class="id-cell">${inp("truckNumber")}</td>
        <td>${editable ? `<textarea class="table-control" rows="1" data-truck-field="issue" data-truck-id="${t.id}">${escapeHtml(t.issue || "")}</textarea>` : `<span>${escapeHtml(t.issue || "-")}</span>`}</td>
        <td>${inp("downDate", "date")}</td>
        <td class="id-cell">${inp("woNumber")}</td>
        <td>${statusCtl}</td>
        ${editable ? `<td><button class="btn btn-danger btn-small" type="button" data-action="truck-delete-row" data-truck-id="${t.id}">✕</button></td>` : ""}
      </tr>
    `;
  }

  // Mobile: one tidy card per truck (no horizontal scroll).
  function renderTruckCards(trucks, editable) {
    if (!trucks.length) return `<div class="truck-mobile-cards"><div class="empty-state">No trucks match.</div></div>`;
    return `
      <div class="truck-mobile-cards">
        ${trucks.map((t) => {
          const row = (label, field, type = "text") => editable
            ? `<label class="truck-card-field"><span>${label}</span><input class="table-control" type="${type}" value="${escapeHtml(t[field] || "")}" data-truck-field="${field}" data-truck-id="${t.id}" /></label>`
            : `<div class="truck-card-field"><span>${label}</span><strong>${escapeHtml(t[field] || "–")}</strong></div>`;
          const statusRow = editable
            ? `<label class="truck-card-field"><span>Status</span><select class="table-control" data-truck-field="status" data-truck-id="${t.id}">${TRUCK_STATUSES.map((s)=>`<option value="${s}" ${(t.status||"Active")===s?"selected":""}>${s}</option>`).join("")}</select></label>`
            : `<div class="truck-card-field"><span>Status</span>${truckStatusPill(t.status)}</div>`;
          return `
            <article class="truck-card">
              <div class="truck-card-head">
                <strong>Truck ${escapeHtml(t.truckNumber || "—")}</strong>
                ${editable ? `<button class="btn btn-danger btn-small" type="button" data-action="truck-delete-row" data-truck-id="${t.id}">Delete</button>` : truckStatusPill(t.status)}
              </div>
              ${editable ? row("Truck #", "truckNumber") : ""}
              ${row("Issue", "issue")}
              ${row("Date", "downDate", "date")}
              ${row("WO #", "woNumber")}
              ${statusRow}
            </article>`;
        }).join("")}
      </div>
    `;
  }

  function saveDownTruck(t) {
    fetch("/api/down-trucks", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(t),
    }).catch(() => {});
  }

  async function addDownTruck(user) {
    const t = {
      id: `dt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      truckNumber: "", issue: "", woNumber: "", downDate: todayISO(), status: "Active",
    };
    downTrucks.unshift(t);
    render();
    try {
      await fetch("/api/down-trucks", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(t),
      });
    } catch (_) {}
    showToast("Truck added.");
  }

  async function deleteDownTruckRow(id) {
    const t = downTrucks.find((x) => x.id === id);
    if (!t) return;
    if (!window.confirm(`Delete truck ${t.truckNumber || "row"}? This cannot be undone.`)) return;
    downTrucks = downTrucks.filter((x) => x.id !== id);
    render();
    try {
      await fetch("/api/down-trucks", {
        method: "DELETE", credentials: "same-origin",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
      });
    } catch (_) {}
    showToast("Truck deleted.");
  }

  function renderShiftsPage(user) {
    const shifts = visibleShifts(user);
    const canEdit = user.role === "admin";
    return `
      <div class="section-title">
        <div>
          <h2>Shift coverage</h2>
          <p>Assign dispatchers, track takeover status, and keep handoff notes visible to the next desk.</p>
        </div>
        ${canEdit ? `<button class="btn btn-primary" type="button" data-action="focus-create-shift">Add shift</button>` : ""}
      </div>

      <div class="${canEdit ? "grid-2" : "stack"}">
        <div class="panel">
          <div class="panel-header">
            <div>
              <h3>Shift board</h3>
              <p>${shifts.length} shifts visible.</p>
            </div>
          </div>
          <div class="panel-body">${renderShiftTable(shifts, canEdit, user)}</div>
        </div>
        ${canEdit ? renderShiftForm() : ""}
      </div>
    `;
  }

  function renderShiftTable(shifts, editable, user) {
    if (!shifts.length) return `<div class="empty-state">No shifts match this view.</div>`;
    return `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Client</th>
              <th>Dispatcher</th>
              <th>Status</th>
              <th>Handoff</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${shifts
        .map(
          (shift) => `
                  <tr>
                    <td>${escapeHtml(shift.date)}</td>
                    <td>${escapeHtml(shift.start)}-${escapeHtml(shift.end)}</td>
                    <td>${escapeHtml(clientName(shift.clientId))}</td>
                    <td>${editable ? renderDispatcherSelect(shift) : escapeHtml(userName(shift.assignedDispatcherId))}</td>
                    <td>${editable ? renderShiftStatusSelect(shift) : renderStatusPill(shift.status)}</td>
                    <td class="compact">${escapeHtml(shift.handoff)}</td>
                    <td>
                      ${user.role === "dispatcher" && (!shift.assignedDispatcherId || shift.assignedDispatcherId === user.id)
              ? `<button class="btn btn-primary btn-small" type="button" data-action="take-shift" data-shift-id="${shift.id}">Take over</button>`
              : `<span class="pill gray">View</span>`
            }
                    </td>
                  </tr>
                `
        )
        .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderDispatcherSelect(shift) {
    const dispatchers = state.users.filter((user) => user.role === "dispatcher" && user.status === "active");
    return `
      <select class="table-control" data-shift-field="assignedDispatcherId" data-shift-id="${shift.id}">
        <option value="">Unassigned</option>
        ${dispatchers.map((user) => `<option value="${user.id}" ${shift.assignedDispatcherId === user.id ? "selected" : ""}>${escapeHtml(user.name)}</option>`).join("")}
      </select>
    `;
  }

  function renderShiftStatusSelect(shift) {
    return `
      <select class="table-control" data-shift-field="status" data-shift-id="${shift.id}">
        ${["Open", "Scheduled", "In Progress", "Completed"].map((status) => `<option value="${status}" ${shift.status === status ? "selected" : ""}>${status}</option>`).join("")}
      </select>
    `;
  }

  function renderShiftForm() {
    return `
      <form class="form-card" data-form="shift" id="create-shift">
        <h3>Create shift</h3>
        <p>New shift coverage appears for admins, owners, and eligible dispatchers.</p>
        <div class="form-grid">
          <div class="field">
            <label>Client</label>
            <select name="clientId" required>
              ${state.clients.map((client) => `<option value="${client.id}">${escapeHtml(client.name)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label>Dispatcher</label>
            <select name="assignedDispatcherId">
              <option value="">Unassigned</option>
              ${state.users.filter((user) => user.role === "dispatcher").map((user) => `<option value="${user.id}">${escapeHtml(user.name)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label>Date</label>
            <input name="date" type="date" value="${todayISO()}" required />
          </div>
          <div class="field">
            <label>Start</label>
            <input name="start" type="time" value="15:00" required />
          </div>
          <div class="field">
            <label>End</label>
            <input name="end" type="time" value="23:00" required />
          </div>
          <div class="field">
            <label>Status</label>
            <select name="status">
              <option>Open</option>
              <option>Scheduled</option>
              <option>In Progress</option>
            </select>
          </div>
          <div class="field wide">
            <label>Handoff</label>
            <textarea name="handoff" placeholder="Coverage notes"></textarea>
          </div>
        </div>
        <div class="inline-form-actions">
          <button class="btn btn-primary" type="submit">Create shift</button>
        </div>
      </form>
    `;
  }

  function renderTakeoverPage(user) {
    const openShifts = state.shifts.filter((shift) => !shift.assignedDispatcherId || shift.assignedDispatcherId === user.id || shift.status === "Open");
    return `
      <div class="section-title">
        <div>
          <h2>Takeover board</h2>
          <p>Claim open coverage or restart a scheduled shift from the dispatcher desk.</p>
        </div>
      </div>

      <div class="grid-3">
        ${openShifts
        .map(
          (shift) => `
              <div class="shift-card">
                <div>
                  <h3>${escapeHtml(shift.start)}-${escapeHtml(shift.end)}</h3>
                  <p class="hint">${escapeHtml(clientName(shift.clientId))} · ${escapeHtml(shift.date)}</p>
                </div>
                <div class="shift-meta">
                  <div><span>Status</span><strong>${escapeHtml(shift.status)}</strong></div>
                  <div><span>Dispatcher</span><strong>${escapeHtml(userName(shift.assignedDispatcherId))}</strong></div>
                  <div><span>Rows</span><strong>${state.recaps.filter((row) => row.shiftId === shift.id).length}</strong></div>
                </div>
                <p class="hint">${escapeHtml(shift.handoff)}</p>
                <button class="btn btn-primary" type="button" data-action="take-shift" data-shift-id="${shift.id}">Take over shift</button>
              </div>
            `
        )
        .join("")}
      </div>
    `;
  }

  function renderUsersPage() {
    return `
      <div class="section-title">
        <div>
          <h2>User management</h2>
          <p>Admins register owners, dispatchers, and other admins, then issue temporary credentials.</p>
        </div>
      </div>

      <div class="grid-2">
        <div class="panel">
          <div class="panel-header">
            <div>
              <h3>Accounts</h3>
              <p>${state.users.length} users registered.</p>
            </div>
          </div>
          <div class="panel-body">${renderUsersTable()}</div>
        </div>
        ${renderUserForm()}
      </div>
    `;
  }

  function renderUsersTable() {
    return `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Client</th>
              <th>Status</th>
              <th>Password</th>
            </tr>
          </thead>
          <tbody>
            ${state.users
        .map(
          (user) => `
                  <tr>
                    <td class="driver-cell">${escapeHtml(user.name)}</td>
                    <td>${escapeHtml(user.email)}</td>
                    <td>${escapeHtml(roleLabel(user.role))}</td>
                    <td>${escapeHtml(clientName(user.clientId))}</td>
                    <td>
                      <select class="table-control" data-user-field="status" data-user-id="${user.id}">
                        ${["active", "disabled"].map((status) => `<option value="${status}" ${user.status === status ? "selected" : ""}>${status}</option>`).join("")}
                      </select>
                    </td>
                    <td>
                      ${user.temporaryPassword ? `<span class="pill amber">Temporary</span>` : `<span class="pill green">Changed</span>`}
                      <button class="btn btn-secondary btn-small" type="button" data-action="reset-password" data-user-id="${user.id}">Reset</button>
                    </td>
                  </tr>
                `
        )
        .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderUserForm() {
    return `
      <form class="form-card" data-form="user">
        <h3>Register account</h3>
        <p>New users receive a temporary password and can change it after sign-in.</p>
        <div class="form-grid">
          <div class="field">
            <label>Name</label>
            <input name="name" required placeholder="Full name" />
          </div>
          <div class="field">
            <label>Email</label>
            <input name="email" type="email" required placeholder="name@company.com" />
          </div>
          <div class="field">
            <label>Role</label>
            <select name="role" required>
              <option value="dispatcher">Dispatcher</option>
              <option value="manager">Manager</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          <div class="field">
            <label>Account</label>
            <select name="accountId" required>
              ${state.clients.length
                ? state.clients.map((account) => `<option value="${account.id}">${escapeHtml(account.name)}</option>`).join("")
                : `<option value="">No accounts available</option>`}
            </select>
          </div>
          <div class="field wide">
            <label>Temporary password</label>
            <input name="password" type="text" required placeholder="Set a temporary password" autocomplete="new-password" />
          </div>
        </div>
        <div class="inline-form-actions">
          <button class="btn btn-primary" type="submit">Create user</button>
        </div>
      </form>
    `;
  }

  function renderClientsPage() {
    const badge = (on, label) =>
      `<span class="pill ${on ? "green" : "gray"}">${label}${on ? " ✓" : ""}</span>`;

    return `
      <div class="section-title">
        <div>
          <h2>Accounts</h2>
          <p>Each account has its own Geotab, Netradyne, Telegram, and an API key for the browser extension.</p>
        </div>
      </div>

      <div class="grid-2">
        <div class="panel">
          <div class="panel-header">
            <div>
              <h3>Accounts</h3>
              <p>${state.clients.length} configured.</p>
            </div>
          </div>
          <div class="panel-body">
            <div class="mini-list">
              ${state.clients
        .map(
          (client) => `
                    <div class="mini-item" style="flex-direction:column;align-items:stretch;gap:8px">
                      <div style="display:flex;justify-content:space-between;align-items:center">
                        <strong>${escapeHtml(client.name)}</strong>
                        <span class="pill ${client.active ? "green" : "gray"}">${client.active ? "Active" : "Inactive"}</span>
                      </div>
                      <div style="display:flex;gap:6px;flex-wrap:wrap">
                        ${badge(client.hasGeotab, "Geotab")}
                        ${badge(client.hasNetradyne, "Netradyne")}
                        ${badge(client.hasTelegram, "Telegram")}
                      </div>
                      <div style="display:flex;gap:8px;align-items:center">
                        <input readonly value="${escapeHtml(client.apiKey || "")}"
                          style="flex:1;font-family:monospace;font-size:12px" title="Extension API key" />
                        <button type="button" class="btn btn-secondary"
                          data-copy-key="${escapeHtml(client.apiKey || "")}">Copy key</button>
                        <button type="button" class="btn btn-secondary"
                          data-edit-account="${escapeHtml(client.id)}">Edit</button>
                        <button type="button" class="btn btn-danger"
                          data-delete-account="${escapeHtml(client.id)}"
                          data-account-name="${escapeHtml(client.name)}">Delete</button>
                      </div>
                    </div>
                  `
        )
        .join("")}
            </div>
          </div>
        </div>
        ${renderAccountForm()}
      </div>
    `;
  }

  function renderAccountForm() {
    const editing = editingAccountId ? state.clients.find((c) => c.id === editingAccountId) : null;
    const v = (x) => escapeHtml(x || "");
    const pwPlaceholder = editing ? "leave blank to keep current" : "";
    return `
      <form class="form-card" data-form="client">
        <h3>${editing ? `Edit account — ${v(editing.name)}` : "Add account"}</h3>
        <p>Geotab needs the <strong>Database</strong> (the company name from your Geotab login screen) or it falls back to the default account.</p>
        <input type="hidden" name="id" value="${editing ? v(editing.id) : ""}" />
        <div class="form-grid">
          <div class="field wide">
            <label>Account name</label>
            <input name="name" ${editing ? "" : "required"} placeholder="Freedom" value="${editing ? v(editing.name) : ""}" />
          </div>
          <div class="field">
            <label>Geotab database</label>
            <input name="geotabDatabase" placeholder="company_db" autocomplete="off" value="${editing ? v(editing.geotabDatabase) : ""}" />
          </div>
          <div class="field">
            <label>Geotab server <span style="opacity:.6">(optional)</span></label>
            <input name="geotabServer" placeholder="my.geotab.com" autocomplete="off" value="${editing ? v(editing.geotabServer) : ""}" />
          </div>
          <div class="field">
            <label>Geotab username / email</label>
            <input name="geotabUsername" placeholder="dispatch@company.com" autocomplete="off" value="${editing ? v(editing.geotabUsername) : ""}" />
          </div>
          <div class="field">
            <label>Geotab password</label>
            <input name="geotabPassword" type="password" autocomplete="new-password" placeholder="${pwPlaceholder}" />
          </div>
          <div class="field">
            <label>Netradyne username / email</label>
            <input name="netradyneEmail" placeholder="abcd.001m" autocomplete="off" value="${editing ? v(editing.netradyneEmail) : ""}" />
          </div>
          <div class="field">
            <label>Netradyne password</label>
            <input name="netradynePassword" type="password" autocomplete="new-password" placeholder="${pwPlaceholder}" />
          </div>
          <div class="field">
            <label>Telegram bot token <span style="opacity:.6">(optional)</span></label>
            <input name="telegramBotToken" autocomplete="off" placeholder="${editing ? pwPlaceholder : "123456:ABC..."}" />
          </div>
          <div class="field">
            <label>Telegram chat ID <span style="opacity:.6">(optional)</span></label>
            <input name="telegramChatId" autocomplete="off" placeholder="-100..." value="${editing ? v(editing.telegramChatId) : ""}" />
          </div>
        </div>
        <div class="inline-form-actions">
          <button class="btn btn-primary" type="submit">${editing ? "Save changes" : "Create account"}</button>
          ${editing ? `<button class="btn btn-secondary" type="button" data-cancel-edit="1">Cancel</button>` : ""}
        </div>
      </form>
    `;
  }

  function renderAnnouncementsPage(user) {
    return `
      <div class="section-title">
        <div>
          <h2>Announcements</h2>
          <p>Operations updates for dispatchers, owners, and admins.</p>
        </div>
      </div>

      <div class="${user.role === "admin" ? "grid-2" : "stack"}">
        <div class="panel">
          <div class="panel-header">
            <div>
              <h3>Updates</h3>
              <p>Visible based on account role.</p>
            </div>
          </div>
          <div class="panel-body">
            <div class="mini-list">
              ${state.announcements
        .filter((item) => item.audience === "all" || item.audience === `${user.role}s`)
        .map(
          (item) => `
                    <div class="mini-item">
                      <div>
                        <strong>${escapeHtml(item.title)}</strong>
                        <span>${escapeHtml(item.body)}</span>
                      </div>
                      <span class="pill blue">${escapeHtml(item.date)}</span>
                    </div>
                  `
        )
        .join("")}
            </div>
          </div>
        </div>
        ${user.role === "admin" ? renderAnnouncementForm() : ""}
      </div>
    `;
  }

  function renderAnnouncementForm() {
    return `
      <form class="form-card" data-form="announcement">
        <h3>Post announcement</h3>
        <p>Send an operational note to a role group.</p>
        <div class="form-grid">
          <div class="field wide">
            <label>Title</label>
            <input name="title" required />
          </div>
          <div class="field">
            <label>Audience</label>
            <select name="audience">
              <option value="all">All</option>
              <option value="dispatchers">Dispatchers</option>
              <option value="owners">Owners</option>
              <option value="admins">Admins</option>
            </select>
          </div>
          <div class="field">
            <label>Date</label>
            <input name="date" type="date" value="${todayISO()}" required />
          </div>
          <div class="field wide">
            <label>Message</label>
            <textarea name="body" required></textarea>
          </div>
        </div>
        <div class="inline-form-actions">
          <button class="btn btn-primary" type="submit">Post</button>
        </div>
      </form>
    `;
  }

  function renderOwnerTeam(user) {
    const dispatchers = state.users.filter((item) => item.role === "dispatcher" && item.clientId === user.clientId);
    return `
      <div class="section-title">
        <div>
          <h2>Dispatch team</h2>
          <p>People assigned to your account and their latest coverage state.</p>
        </div>
      </div>
      <div class="grid-3">
        ${dispatchers
        .map((dispatcher) => {
          const shift = state.shifts.find((item) => item.assignedDispatcherId === dispatcher.id);
          return `
              <div class="panel">
                <div class="panel-body">
                  <div class="user-chip">
                    <div class="avatar">${escapeHtml(initials(dispatcher.name))}</div>
                    <div>
                      <strong>${escapeHtml(dispatcher.name)}</strong>
                      <span>${escapeHtml(dispatcher.email)}</span>
                    </div>
                  </div>
                  <div class="shift-meta" style="margin-top: 14px;">
                    <div><span>Status</span><strong><span class="status-dot ${shift ? "" : "idle"}"></span>${escapeHtml(shift ? shift.status : "No shift")}</strong></div>
                    <div><span>Desk</span><strong>${escapeHtml(shift ? shift.start + "-" + shift.end : "-")}</strong></div>
                    <div><span>Rows</span><strong>${state.recaps.filter((row) => row.assignedDispatcherId === dispatcher.id).length}</strong></div>
                  </div>
                </div>
              </div>
            `;
        })
        .join("")}
      </div>
    `;
  }

  function renderOwnerIssues(user) {
    const rows = visibleRecaps(user).filter((row) => row.issues || missingRequired(row).length > 0 || row.lateFirstStop);
    const issueCards = rows.length ? rows.slice(0, 12).map((row) => {
      const missing = missingRequired(row);
      const note = row.issues || (missing.length ? `Missing: ${missing.join(", ")}` : "Late first stop");
      return `
        <div class="late-item-card">
          <div class="lic-header">
            <div class="lic-info">
              <strong class="lic-driver">${escapeHtml(row.driverAssigned || row.vrid || "Driver")}</strong>
              <span class="lic-vrid">${escapeHtml(row.tripId || "")}</span>
            </div>
            <div class="lic-late-badge">${escapeHtml(row.vrid || row.blockId || "—")}</div>
          </div>
          <div style="font-size:0.82rem; color:#e2e8f0;">${escapeHtml(note)}</div>
          <div style="margin-top:4px;">${renderStatusPill(row.status)}</div>
        </div>
      `;
    }).join("") : `<div class="empty-state">No open issues.</div>`;

    return `
      <div class="section-title">
        <div>
          <h2>Issues</h2>
          <p>Exception queue from your daily recap data.</p>
        </div>
      </div>
      <div class="mobile-card-list" style="max-width:820px;">
        ${issueCards}
      </div>
    `;
  }

  function renderSettings(user) {
    return `
      <div class="section-title">
        <div>
          <h2>Settings</h2>
          <p>Update your password and account preferences.</p>
        </div>
      </div>

      <div class="grid-2">
        <form class="form-card" data-form="password">
          <h3>Change password</h3>
          <p>${user.temporaryPassword ? "Your account is using a temporary password." : "Keep credentials private and unique to this portal."}</p>
          <div class="form-grid">
            <div class="field wide">
              <label>Current password</label>
              <input name="currentPassword" type="password" required />
            </div>
            <div class="field">
              <label>New password</label>
              <input name="newPassword" type="password" minlength="6" required />
            </div>
            <div class="field">
              <label>Confirm password</label>
              <input name="confirmPassword" type="password" minlength="6" required />
            </div>
          </div>
          <div class="inline-form-actions">
            <button class="btn btn-primary" type="submit">Update password</button>
          </div>
        </form>

        <div class="panel">
          <div class="panel-header">
            <div>
              <h3>Account</h3>
              <p>Current portal session.</p>
            </div>
          </div>
          <div class="panel-body">
            <div class="mini-list">
              <div class="mini-item"><div><strong>${escapeHtml(user.name)}</strong><span>${escapeHtml(user.email)}</span></div><span class="pill blue">${escapeHtml(roleLabel(user.role))}</span></div>
              <div class="mini-item"><div><strong>${escapeHtml(clientName(user.clientId))}</strong><span>${escapeHtml(user.timezone)}</span></div><span class="pill gray">Workspace</span></div>
              <div class="mini-item"><div><strong>Last login</strong><span>${escapeHtml(user.lastLogin || "First login")}</span></div><span class="pill ${user.temporaryPassword ? "amber" : "green"}">${user.temporaryPassword ? "Temporary password" : "Password changed"}</span></div>
            </div>
            ${user.role === "admin" ? `<div class="inline-form-actions"><button class="btn btn-danger" type="button" data-action="reset-demo">Reset demo data</button></div>` : ""}
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <div>
              <h3>Notifications</h3>
              <p>Get alerts on this device for your account (HOS, Netradyne, bobtail, arrivals).</p>
            </div>
            <span class="pill ${notificationPermission() === "granted" ? "green" : "amber"}">${ownerNotificationShortLabel()}</span>
          </div>
          <div class="panel-body">
            <div class="inline-form-actions" style="flex-wrap:wrap;gap:8px">
              <button class="btn btn-primary" type="button" data-action="enable-notifications" ${notificationPermission() === "granted" ? "disabled" : ""}>
                ${notificationPermission() === "granted" ? "Notifications enabled" : "Enable phone notifications"}
              </button>
              <button class="btn btn-secondary" type="button" data-action="install-app">Install app</button>
            </div>
            <p class="muted compact" style="margin-top:8px"><strong>iPhone:</strong> Web push only works from the installed app — tap Share → <em>Add to Home Screen</em>, open <em>that</em> icon, then Enable notifications. Safari tabs won't receive push.</p>
          </div>
        </div>
      </div>
    `;
  }

  function notificationPermission() {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission;
  }

  function ownerNotificationShortLabel() {
    const permission = notificationPermission();
    if (permission === "granted") return "On";
    if (permission === "denied") return "Blocked";
    if (permission === "unsupported") return "N/A";
    return "Off";
  }

  function ownerNotificationButtonLabel() {
    const permission = notificationPermission();
    if (permission === "granted") return "Phone alerts on";
    if (permission === "denied") return "Alerts blocked";
    if (permission === "unsupported") return "Alerts unavailable";
    return "Enable phone alerts";
  }

  async function enableOwnerNotifications(user) {
    if (!user || user.role !== "owner") {
      showToast("Owner alerts are available for owner accounts.");
      return;
    }
    if (!("Notification" in window)) {
      showToast("This browser does not support notifications.");
      return;
    }

    const permission = Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();

    if (permission !== "granted") {
      showToast("Notifications were not enabled.");
      render();
      return;
    }

    const pushResult = await subscribeToPush();
    if (pushResult.ok) {
      showToast("Push alerts enabled — you'll get alerts even with the app closed.");
    } else if (pushResult.reason === "server_not_configured") {
      showToast("Alerts enabled on this screen, but push isn't configured on the server yet.");
    } else {
      showToast("Alerts enabled. Background push isn't available on this device/browser.");
    }
    hosNotified = {};
    saveHosNotificationMemory();
    await queueOwnerHosNotifications(user, true);
    render();
  }

  // Push notifications for ANY role (owner, dispatcher, manager, admin). Ties the
  // device's subscription to the logged-in user's account (account-scoped alerts).
  async function enableNotifications(user) {
    if (!user) return;
    if (!("Notification" in window)) { showToast("This browser does not support notifications."); return; }
    const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (permission !== "granted") { showToast("Notifications were not enabled."); render(); return; }
    const pushResult = await subscribeToPush();
    if (pushResult.ok) showToast("Push alerts enabled for your account.");
    else if (pushResult.reason === "server_not_configured") showToast("Enabled here, but push isn't configured on the server yet.");
    else showToast("Enabled, but background push isn't available on this device/browser.");
    render();
  }

  // One-tap self-test: sends a real alert to THIS user's account and reports
  // exactly what happened (how many devices got push, Telegram status).
  async function sendTestNotification(user) {
    if (!user) return;
    try {
      const res = await fetch("/api/test-alert?type=hos&critical=0", { credentials: "same-origin" });
      const d = await res.json();
      if (!d.success) { showToast(d.error || "Test failed."); return; }
      const subs = d.deviceSubscriptions ?? 0;
      const sent = (d.push && typeof d.push.sent === "number") ? d.push.sent : 0;
      const tg = d.telegram && d.telegram.ok ? "Telegram ✓"
        : (d.telegram && d.telegram.skipped === "not_configured") ? "Telegram not set up"
        : "Telegram failed";
      if (subs === 0) {
        showToast("No devices subscribed. Tap 'Enable phone notifications' first (on the installed app).");
      } else {
        showToast(`Test sent → push ${sent}/${subs} device(s) · ${tg}`);
      }
    } catch (_) {
      showToast("Could not reach the server for the test.");
    }
  }

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }
  function isIOS() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  }

  async function installOwnerApp() {
    if (isStandalone()) {
      showToast("The app is already installed — open it from your home screen.");
      return;
    }
    // Android/desktop Chrome: use the captured install prompt.
    if (installPromptEvent) {
      installPromptEvent.prompt();
      await installPromptEvent.userChoice.catch(() => null);
      installPromptEvent = null;
      render();
      return;
    }
    // iOS Safari has no prompt event — guide the user to Add to Home Screen.
    if (isIOS()) {
      showToast("On iPhone: tap the Share button, then 'Add to Home Screen'.");
      return;
    }
    showToast("To install: open your browser menu and choose 'Install app' / 'Add to Home Screen'.");
  }

  async function queueOwnerHosNotifications(user, force = false) {
    if (!user || user.role !== "owner" || notificationPermission() !== "granted") return;

    const drivers = (state.hosDrivers || []).filter((driver) => !driver.clientId || driver.clientId === user.clientId);
    const alerts = [];
    for (const driver of drivers) {
      for (const risk of hosRisksFor(driver, 60)) {
        alerts.push({ driver, risk });
      }
    }
    alerts.sort((a, b) => a.risk.minutes - b.risk.minutes);

    for (const { driver, risk } of alerts.slice(0, 12)) {
      const bucket = risk.tier === "critical"
        ? Math.floor(risk.minutes / 5)
        : Math.floor(risk.minutes / 15);
      const key = `${user.clientId}:${driver.id}:${risk.metric}:${risk.tier}:${bucket}`;
      if (!force && hosNotified[key]) continue;
      hosNotified[key] = Date.now();
      await showOwnerHosNotification(driver, risk);
    }
    saveHosNotificationMemory();
  }

  async function syncHosAlertsToTelegram(drivers) {
    if (!drivers?.length) return;
    try {
      await fetch("/api/hos-alerts/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drivers }),
      });
    } catch (error) {
      console.warn("HOS Telegram sync failed:", error);
    }
  }
function showInAppBanner(title, body, isCritical) {
  const banner = document.getElementById('pushBanner');
  if (!banner) return;

  // Set content
  banner.innerHTML = `
    <div class="banner-icon">${isCritical ? '⚠️' : '⚡'}</div>
    <div class="banner-body">
      <div class="banner-title">${escapeHtml(title)}</div>
      <div class="banner-text">${escapeHtml(body)}</div>
    </div>
    <button class="banner-close" data-action="dismiss-banner">✕</button>
  `;

  // Add critical class for styling
  banner.className = 'push-banner' + (isCritical ? ' critical' : '');
  
  // Show with animation
  requestAnimationFrame(() => {
    banner.classList.add('show');
  });

  // Auto‑dismiss after 6 seconds
  clearTimeout(banner._timeout);
  banner._timeout = setTimeout(() => {
    banner.classList.remove('show');
  }, 6000);
}
async function showOwnerHosNotification(driver, risk) {
  const isCritical = risk.tier === "critical";
  const title = isCritical
    ? `HOS CRITICAL - ${driver.driverName}`
    : `HOS Warning - ${driver.driverName}`;
  const status = displayStatus(driver.currentStatus || driver.status);
  const body = `${risk.label}: ${risk.value} left (${risk.minutes} min) · ${status}`;

  // Always show in-app banner when page is visible
  if (document.visibilityState === 'visible') {
    showInAppBanner(title, body, isCritical);
  } else {
    // Fallback to native notification for background
    new Notification(title, { body, icon: 'ndk.png', badge: 'ndk.png', requireInteraction: isCritical });
  }
}
// Helper to send Telegram alerts via API
async function sendTelegramAlert(title, body) {
  try {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `${title}\n${body}` }),
    });
  } catch (e) {
    console.warn('Telegram alert failed:', e);
  }
}

// Status change notification
async function sendStatusChangeNotification(driver, direction) {
  const statusText = direction === 'on' ? 'On Duty' : 'Off Duty';
  const title = `${driver.driverName} is now ${statusText}`;
  const body = `Status changed to ${displayStatus(driver.currentStatus || driver.status)}`;
  const key = `${driver.id}:${driver.currentStatus}`;
  if (statusNotified[key]) return;
  statusNotified[key] = Date.now();
  saveNotificationMemory(STATUS_MEMORY_KEY, statusNotified);
if (document.visibilityState === 'visible') {
  showInAppBanner(title, body, false);
} else {
  new Notification(title, { body, icon: 'ndk.png', requireInteraction: false });
}  await sendTelegramAlert(title, body);
}
  function handleSubmit(event) {
    const form = event.target.closest("form");
    if (!form) return;
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const formType = form.dataset.form;

    if (formType === "login") return login(data.email, data.password);
    if (formType === "password") return updatePassword(data);
    if (formType === "user") return createUser(data, form);
    if (formType === "shift") return createShift(data, form);
    if (formType === "client") return createClient(data, form);
    if (formType === "announcement") return createAnnouncement(data, form);
  }

  async function handleClick(event) {
    const copyKeyBtn = event.target.closest("[data-copy-key]");
    if (copyKeyBtn) {
      const key = copyKeyBtn.getAttribute("data-copy-key") || "";
      try {
        await navigator.clipboard.writeText(key);
        showToast("API key copied.");
      } catch (_) {
        showToast(key ? `API key: ${key}` : "No API key.");
      }
      return;
    }
    const editAccountBtn = event.target.closest("[data-edit-account]");
    if (editAccountBtn) {
      editingAccountId = editAccountBtn.getAttribute("data-edit-account");
      render();
      return;
    }
    if (event.target.closest("[data-cancel-edit]")) {
      editingAccountId = null;
      render();
      return;
    }
    const deleteAccountBtn = event.target.closest("[data-delete-account]");
    if (deleteAccountBtn) {
      const id = deleteAccountBtn.getAttribute("data-delete-account");
      const name = deleteAccountBtn.getAttribute("data-account-name") || id;
      if (!window.confirm(`Delete account "${name}"? This removes its users, logins, and push subscriptions. This cannot be undone.`)) return;
      try {
        const res = await fetch("/api/admin/accounts", {
          method: "DELETE",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        const out = await res.json();
        if (!out.success) return showToast(out.error || "Could not delete account.");
        if (editingAccountId === id) editingAccountId = null;
        await loadAccountsAndUsers();
        render();
        showToast(`Account "${name}" deleted.`);
      } catch (_) {
        showToast("Network error deleting account.");
      }
      return;
    }
    // Dismiss push banner
if (event.target.closest('[data-action="dismiss-banner"]')) {
  const banner = document.getElementById('pushBanner');
  if (banner) banner.classList.remove('show');
  return;
}
    const sortBtn = event.target.closest("[data-netradyne-sort]");
if (sortBtn && currentView === 'netradyne-dashboard') {
  const col = sortBtn.dataset.netradyneSort;
  if (netradyneSortColumn === col) {
    netradyneSortDir = netradyneSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    netradyneSortColumn = col;
    netradyneSortDir = 'asc';
  }
  render();
  return;
}
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      currentView = viewButton.dataset.view;
      sidebarOpen = false;
      render();
      if (currentView === "owner-hos" && ["owner", "dispatcher"].includes(getCurrentUser()?.role)) {
        await fetchGeotabDriversReadiness();
      }
      if (currentView === "netradyne-dashboard") pollNetradyneAlerts();
      return;
    }


    const filter = event.target.closest("[data-filter]");
    if (filter) {
      recapFilter = filter.dataset.filter;
      render();
      return;
    }

    const readinessFilter = event.target.closest("[data-readiness]");
    if (readinessFilter && currentView === "owner-hos") {
      ownerHosQuickReadiness = readinessFilter.dataset.readiness || "";
      render();
      return;
    }

    const sortHeader = event.target.closest("[data-hos-sort]");
    if (sortHeader && currentView === "owner-hos") {
      event.preventDefault();
      const column = sortHeader.dataset.hosSort;
      if (ownerHosSortColumn === column) {
        ownerHosSortDir = ownerHosSortDir === "asc" ? "desc" : "asc";
      } else {
        ownerHosSortColumn = column;
        ownerHosSortDir = "asc";
      }
      render();
      return;
    }
const recapToggle = event.target.closest("[data-action='toggle-recap-detail']");
if (recapToggle) {
  event.preventDefault();
  const id = recapToggle.dataset.recapId;
  const card = recapToggle.closest('.recap-card-v2');
  if (card) {
    const details = card.querySelector('.recap-details');
    const icon = card.querySelector('.rcv-expand-icon');
    if (details) {
      const isOpen = details.style.display === 'grid';
      details.style.display = isOpen ? 'none' : 'grid';
      if (icon) icon.textContent = isOpen ? '▼' : '▲';
      // Remember so a background re-render doesn't collapse the card.
      if (isOpen) expandedRecapIds.delete(id); else expandedRecapIds.add(id);
    }
  }
  return;
}
    const action = event.target.closest("[data-action]");
    if (!action) return;
    const user = getCurrentUser();
    switch (action.dataset.action) {
      case "logout": {
        fetch("/api/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
        const loggedOutId = session?.userId;
        session = null;
        saveSession();
        state.users = (state.users || []).filter((u) => u.id !== loggedOutId);
        currentView = "login";
        render();
        showToast("Signed out.");
        break;
      }
        case "hos-open-filters":
  hosFiltersOpen = true;
  render();
  break;
  case "acknowledge-alert":
  const id = action.dataset.alertId;
  await fetch(`/api/netradyne/alerts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Acknowledged' }),
  });
  await pollNetradyneAlerts();   // refresh data
  render();
  break;
case "hos-close-filters":
  hosFiltersOpen = false;
  render();
  break;
      case "copy-starting-message":
        copyStartingMessage(action.dataset.recapId);
        break;
      case "take-shift":
        takeShift(action.dataset.shiftId, user);
        break;
      case "reset-password":
        resetPassword(action.dataset.userId);
        break;
      case "mark-complete-visible":
        markCleanRowsComplete(user);
        break;
      case "recap-add-row":
        addRecapRow(user);
        break;
      case "recap-delete-row":
        deleteRecapRow(action.dataset.recapId);
        break;
      case "recap-today":
        selectedRecapDate = todayISO();
        render();
        break;
      case "recap-print":
        exportRecapPrintable(user);
        break;
      case "truck-add-row":
        await addDownTruck(user);
        break;
      case "truck-delete-row":
        await deleteDownTruckRow(action.dataset.truckId);
        break;
      case "focus-create-shift":
        document.getElementById("create-shift")?.scrollIntoView({ behavior: "smooth", block: "center" });
        break;
      case "enable-owner-notifications":
        enableOwnerNotifications(user);
        break;
      case "enable-notifications":
        await enableNotifications(user);
        break;
      case "install-app":
        await installOwnerApp();
        break;
      case "install-owner-app":
        installOwnerApp();
        break;
      case "owner-hos-refresh":
        await fetchGeotabDriversReadiness();
        break;
      case "owner-hos-toggle-auto-refresh":
        toggleOwnerHosAutoRefresh();
        break;
        case "toggle-sidebar":
  sidebarOpen = !sidebarOpen;
  render();
  break;
      case "hos-toggle-filters":
        const controlsBody = document.getElementById("hosControlsBody");
        if (controlsBody) {
          controlsBody.classList.toggle("is-visible");
        }
        break;
      case "hos-clear-filters":
        ownerHosSearchText = "";
        ownerHosStatusFilter = "";
        ownerHosQuickReadiness = "";
        ownerHosSortColumn = "";
        ownerHosSortDir = "asc";
        ownerHosSortFilter = "onDutyFirst";
        render();
        break;
      case "reset-demo":
        state = structuredClone(seedState);
        session = null;
        hosNotified = {};
        saveState();
        saveSession();
        saveHosNotificationMemory();
        currentView = "login";
        render();
        showToast("Demo data reset.");
        break;
      default:
        break;
    }
  }

  async function handleChange(event) {
    // Don't re-render on login view to avoid clearing form inputs
    if (currentView === "login") return;

    const datePicker = event.target.closest("[data-recap-date-picker]");
    if (datePicker) {
      if (datePicker.value) selectedRecapDate = datePicker.value;
      render();
      return;
    }

    const dateSelect = event.target.closest("[data-recap-date]");
    if (dateSelect) {
      selectedRecapDate = dateSelect.value;
      render();
      return;
    }

    const importInput = event.target.closest("[data-import-trips]");
    if (importInput) {
      const file = importInput.files && importInput.files[0];
      if (!file) return;
      try {
        await importTripsCsvFile(file, getCurrentUser());
      } catch (error) {
        showToast(error.message || "Could not import trips CSV.");
      } finally {
        importInput.value = "";
      }
      return;
    }

    const truckFilter = event.target.closest("[data-truck-filter]");
    if (truckFilter) {
      truckStatusFilter = truckFilter.value;
      render();
      return;
    }

    const truckField = event.target.closest("[data-truck-field]");
    if (truckField) {
      const t = downTrucks.find((x) => x.id === truckField.dataset.truckId);
      if (!t) return;
      t[truckField.dataset.truckField] = truckField.value;
      saveDownTruck(t); // persist to DB; no re-render so the cursor stays put
      return;
    }

    const recapField = event.target.closest("[data-recap-field]");
    if (recapField) {
      const row = state.recaps.find((item) => item.id === recapField.dataset.recapId);
      if (!row) return;
      const field = recapField.dataset.recapField;
      if (field === "vrids") {
        // All VRIDs, freely editable — split on newlines/commas, keep every one.
        row.vrids = recapField.value.split(/[\n,]+/).map((v) => v.trim()).filter(Boolean);
        addAudit(`${getCurrentUser().name} edited VRIDs for ${row.driverAssigned}.`);
        saveState();
        return;
      }
      row[field] = recapField.type === "checkbox" ? recapField.checked : recapField.value;
      // Requested Start is always 30 minutes before Stop 1 upcoming.
      if (field === "stopOneupcoming") {
        const computed = subtractMinutes(row.stopOneupcoming, 30);
        if (computed) {
          row.requestedStart = computed;
          const rsInput = recapField.closest("tr, .recap-card-v2")?.querySelector('[data-recap-field="requestedStart"]');
          if (rsInput) rsInput.value = computed; // update in place, no full re-render
        }
      }
      addAudit(`${getCurrentUser().name} updated ${row.driverAssigned} ${field}.`);
      saveState();
      // No full re-render here: the value is already in the field and saved. Rebuilding
      // the table would move the cursor/focus and interrupt editing. Just refresh the
      // row's "has issue / required" styling in place.
      updateRecapRowStatus(recapField.closest("tr, .recap-card-v2"), row);
      showToast("Daily recap updated.");
      return;
    }

    if (currentView === "owner-hos") {
      const hosSelect = event.target.closest("[data-owner-hos-change]");
      if (hosSelect) {
        const field = hosSelect.dataset.hosField;
        if (field === "status") ownerHosStatusFilter = hosSelect.value;
        if (field === "sort") {
          ownerHosSortFilter = hosSelect.value;
          ownerHosSortColumn = "";
          ownerHosSortDir = "asc";
        }     
        render();
        return;
      }
    }

    const shiftField = event.target.closest("[data-shift-field]");
    if (shiftField) {
      const shift = state.shifts.find((item) => item.id === shiftField.dataset.shiftId);
      if (!shift) return;
      shift[shiftField.dataset.shiftField] = shiftField.value || null;
      if (shiftField.dataset.shiftField === "assignedDispatcherId") {
        state.recaps.filter((row) => row.shiftId === shift.id).forEach((row) => {
          row.assignedDispatcherId = shift.assignedDispatcherId;
        });
      }
      addAudit(`${getCurrentUser().name} updated shift ${shift.start}-${shift.end}.`);
      saveState();
      render();
      showToast("Shift updated.");
      return;
    }

    const userField = event.target.closest("[data-user-field]");
    if (userField) {
      const user = state.users.find((item) => item.id === userField.dataset.userId);
      if (!user) return;
      user[userField.dataset.userField] = userField.value;
      addAudit(`${getCurrentUser().name} updated ${user.name}.`);
      saveState();
      render();
      showToast("User updated.");
    }
  }

  function handleInput(event) {
    // Don't re-render on login view to avoid clearing form inputs
    if (currentView === "login") return;

    const hosSearch = event.target.closest("[data-hos-search]");
    if (hosSearch && currentView === "owner-hos") {
      ownerHosSearchText = hosSearch.value;
      ownerHosPreserveSearchFocus = true;
      window.clearTimeout(handleInput.searchTimer);
      handleInput.searchTimer = window.setTimeout(render, 120);
      return;
    }
    const netradyneSearch = event.target.closest("[data-netradyne-search]");
if (netradyneSearch && currentView === 'netradyne-dashboard') {
  netradyneSearchText = netradyneSearch.value;
  window.clearTimeout(handleInput.searchTimer);
  handleInput.searchTimer = window.setTimeout(render, 200);
  return;
}

    const search = event.target.closest("[data-search]");
    if (!search) return;
    searchText = search.value;
    window.clearTimeout(handleInput.searchTimer);
    handleInput.searchTimer = window.setTimeout(render, 120);
  }

  async function login(email, password) {
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.success) {
        showToast(data.error || "Email or password is incorrect.");
        return;
      }
      const appUser = applyServerUser(data.user, data.account);
      session = { userId: appUser.id };
      currentView = defaultView(appUser);
      render();
      await loadAccountsAndUsers();
      await loadRecaps();
      await loadDownTrucks();
      render();
      if (appUser.role === "owner") fetchGeotabDriversReadiness();
      showToast(`Welcome, ${appUser.name}.`);
    } catch (error) {
      console.warn("Login failed:", error);
      showToast("Could not reach the server. Try again.");
    }
  }

  async function updatePassword(data) {
    if (data.newPassword !== data.confirmPassword) {
      showToast("New passwords do not match.");
      return;
    }
    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
      });
      const result = await res.json();
      if (!result.success) {
        showToast(result.error || "Could not update password.");
        return;
      }
      render();
      showToast("Password updated.");
    } catch (error) {
      console.warn("Password update failed:", error);
      showToast("Could not reach the server. Try again.");
    }
  }

  async function createUser(data, form) {
    const email = data.email.trim().toLowerCase();
    if (state.users.some((user) => user.email.toLowerCase() === email)) {
      showToast("A user with that email already exists.");
      return;
    }
    // App users carry the account id in `clientId`; the form field is `accountId`.
    const accountId = data.accountId || getCurrentUser()?.clientId || null;
    if (!accountId) {
      showToast("Pick an account for this user.");
      return;
    }
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          email,
          name: data.name.trim(),
          role: data.role,
          password: data.password,
          accountId,
        }),
      });
      const result = await res.json();
      if (!result.success) {
        showToast(result.error || "Could not create user.");
        return;
      }
      await loadAccountsAndUsers(); // refresh the real users list from the server
      form.reset();
      render();
      showToast(`Created ${data.name.trim()}.`);
    } catch (error) {
      console.warn("Create user failed:", error);
      showToast("Could not reach the server. Try again.");
    }
  }

  function createShift(data, form) {
    const shift = {
      id: `s-${Date.now()}`,
      clientId: data.clientId,
      assignedDispatcherId: data.assignedDispatcherId || null,
      date: data.date,
      start: data.start,
      end: data.end,
      status: data.status,
      desk: `${clientName(data.clientId)} Dispatch team`,
      handoff: data.handoff || "No handoff notes yet.",
    };
    state.shifts.push(shift);
    addAudit(`${getCurrentUser().name} created a shift for ${clientName(data.clientId)}.`);
    saveState();
    form.reset();
    render();
    showToast("Shift created.");
  }

  async function createClient(data, form) {
    const isEdit = Boolean(data.id);
    const name = (data.name || "").trim();
    if (!isEdit && !name) return showToast("Account name is required.");
    // On create, blank fields are omitted. On edit, blank text fields are still sent
    // (so you can clear them), but blank passwords/tokens are omitted to keep current.
    const t = (x) => (x || "").trim();
    const payload = isEdit
      ? {
          id: data.id,
          name: name || undefined,
          geotabServer: t(data.geotabServer),
          geotabDatabase: t(data.geotabDatabase),
          geotabUsername: t(data.geotabUsername),
          geotabPassword: data.geotabPassword || undefined,
          netradyneEmail: t(data.netradyneEmail),
          netradynePassword: data.netradynePassword || undefined,
          telegramBotToken: data.telegramBotToken || undefined,
          telegramChatId: t(data.telegramChatId),
        }
      : {
          name,
          geotabServer: t(data.geotabServer) || undefined,
          geotabDatabase: t(data.geotabDatabase) || undefined,
          geotabUsername: t(data.geotabUsername) || undefined,
          geotabPassword: data.geotabPassword || undefined,
          netradyneEmail: t(data.netradyneEmail) || undefined,
          netradynePassword: data.netradynePassword || undefined,
          telegramBotToken: t(data.telegramBotToken) || undefined,
          telegramChatId: t(data.telegramChatId) || undefined,
        };
    try {
      const res = await fetch("/api/admin/accounts", {
        method: isEdit ? "PUT" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const out = await res.json();
      if (!out.success) return showToast(out.error || "Could not save account.");
      editingAccountId = null;
      await loadAccountsAndUsers();
      render();
      showToast(isEdit ? `Account "${name}" updated.` : `Account "${name}" created. API key is in the list.`);
    } catch (error) {
      showToast("Network error saving account.");
    }
  }

  function createAnnouncement(data, form) {
    state.announcements.unshift({
      id: `a-${Date.now()}`,
      title: data.title,
      body: data.body,
      audience: data.audience,
      date: data.date,
    });
    addAudit(`${getCurrentUser().name} posted announcement ${data.title}.`);
    saveState();
    form.reset();
    render();
    showToast("Announcement posted.");
  }

  async function importTripsCsvFile(file, user) {
    if (!user || user.role === "owner") {
      throw new Error("Only admins and dispatchers can import trips.");
    }
    const clientId = user.role === "admin"
      ? app.querySelector("[data-import-client]")?.value || state.clients[0]?.id
      : user.clientId;
    if (!clientId) throw new Error("Choose a client before importing.");

    const text = await readFileAsText(file);
    const csvRows = parseCsv(text);
    const importedRows = buildImportedRecapRows(csvRows, clientId, user, file.name);
    if (!importedRows.length) throw new Error("No trip rows were found in this CSV.");

    let created = 0;
    let updated = 0;
    importedRows.forEach((incoming) => {
      const existing = state.recaps.find((row) =>
        row.clientId === incoming.clientId &&
        row.dailyDate === incoming.dailyDate &&
        row.blockId === incoming.blockId &&
        row.tripId === incoming.tripId
      );
      if (existing) {
        const manualFields = {
          id: existing.id,
          shiftId: existing.shiftId,
          assignedDispatcherId: existing.assignedDispatcherId || incoming.assignedDispatcherId,
          dvir: existing.dvir,
          fuel: existing.fuel,
          onDuty: existing.onDuty,
          finalArrivalHome: existing.finalArrivalHome,
          driverLogOff: existing.driverLogOff,
          hosCheck: existing.hosCheck,
          lateFirstStop: existing.lateFirstStop,
          issues: existing.issues,
          bol: existing.bol,
          blockDeepDive: existing.blockDeepDive,
          startingMessage: existing.startingMessage,
        };
        Object.assign(existing, incoming, manualFields);
        updated += 1;
      } else {
        state.recaps.push(incoming);
        created += 1;
      }
    });

    refreshRecapDays(clientId, importedRows, file.name);
    selectedRecapDate = getPrimaryImportedDate(importedRows);
    recapFilter = "all";
    addAudit(`${user.name} imported ${created} new and ${updated} updated recap rows from ${file.name}.`);
    saveState();
    render();
    showToast(`Imported ${created} new rows and updated ${updated} rows from ${file.name}.`);
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read the selected file."));
      reader.readAsText(file);
    });
  }

  function parseCsv(text) {
    const cleanText = String(text || "").replace(/^\uFEFF/, "");
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let index = 0; index < cleanText.length; index += 1) {
      const char = cleanText[index];
      const next = cleanText[index + 1];
      if (char === "\"") {
        if (inQuotes && next === "\"") {
          cell += "\"";
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        row.push(cell);
        cell = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") index += 1;
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }
    if (cell || row.length) {
      row.push(cell);
      rows.push(row);
    }

    const headers = (rows.shift() || []).map((header) => header.trim());
    return rows
      .filter((items) => items.some((item) => String(item || "").trim()))
      .map((items) => {
        const object = {};
        headers.forEach((header, index) => {
          object[header] = String(items[index] || "").trim();
        });
        return object;
      });
  }

  function buildImportedRecapRows(csvRows, clientId, user, fileName) {
    const grouped = new Map();
    csvRows.forEach((csvRow, index) => {
      const blockId = csvValue(csvRow, "Block ID");
      const tripId = csvValue(csvRow, "Trip ID");
      const loadId = csvValue(csvRow, "Load ID");
      if (!tripId) return;
      const key = `${blockId || "NO-BLOCK"}::${tripId || loadId || index}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(csvRow);
    });

    return [...grouped.values()].map((groupRows) => {
      const first = groupRows[0];
      const blockId = csvValue(first, "Block ID");
      const tripId = csvValue(first, "Trip ID");
      const stopOneTimes = groupRows.map((row) => dateTimeFromCsv(row, "Stop 1 Planned Arrival Date", "Stop 1 Planned Arrival Time")).filter(Boolean);
      const actualStopOneTimes = groupRows.map((row) => dateTimeFromCsv(row, "Stop 1 Actual Arrival Date", "Stop 1 Actual Arrival Time")).filter(Boolean);
      const finalupcomingTimes = groupRows.map((row) => dateTimeFromCsv(row, "Stop 2 Planned Arrival Date", "Stop 2 Planned Arrival Time")).filter(Boolean);
      const earliestStopOne = earliestDateTime(stopOneTimes);
      const earliestActual = earliestDateTime(actualStopOneTimes);
      const latestFinal = latestDateTime(finalupcomingTimes);
      const dailyDate = earliestStopOne?.date || selectedRecapDate || todayISO();
      const loadIds = unique(groupRows.map((row) => csvValue(row, "Load ID")).filter(Boolean));
      const truck = firstNonEmpty(groupRows, ["Tractor Vehicle ID"]);

      return {
        id: makeId("r"),
        clientId,
        dailyDate,
        shiftId: null,
        assignedDispatcherId: user.role === "dispatcher" ? user.id : null,
        driverAssigned: firstNonEmpty(groupRows, ["Driver Name"]) || "Unassigned Driver",
        tripDate: earliestStopOne ? `${earliestStopOne.date} ${earliestStopOne.time}` : `${dailyDate} 00:00`,
        status: mapTripStatus(firstNonEmpty(groupRows, ["Trip Stage", "Load Execution Status"])),
        tripId,
        blockId: blockId || "Pending Block",
        vrids: loadIds,
        solo: detectSoloType(groupRows),
        truck,
        dvir: "Not Started",
        fuel: "",
        onDuty: "",
        requestedStart: earliestStopOne ? subtractMinutes(earliestStopOne.time, 30) : "",
        stopOneupcoming: earliestStopOne?.time || "",
        actualCheckIn: earliestActual ? `${earliestActual.date} ${earliestActual.time}` : "",
        scheduledFinal: latestFinal?.time || "",
        finalArrivalHome: "",
        driverLogOff: "",
        hosCheck: "HOS - Shift Pre Check",
        lateFirstStop: false,
        issues: "",
        bol: "Pending",
        blockDeepDive: "",
        startingMessage: "",
        importSource: fileName,
        importedAt: new Date().toISOString(),
        sourceLoadCount: groupRows.length,
      };
    });
  }

  function csvValue(row, headerName) {
    const target = normalizeCsvHeader(headerName);
    const match = Object.keys(row).find((key) => normalizeCsvHeader(key) === target);
    return match ? String(row[match] || "").trim() : "";
  }

  function normalizeCsvHeader(header) {
    return String(header || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function dateTimeFromCsv(row, dateHeader, timeHeader) {
    const date = toIsoDate(csvValue(row, dateHeader));
    const time = normalizeTime(csvValue(row, timeHeader));
    if (!date || !time) return null;
    return {
      date,
      time,
      sort: `${date}T${time}:00`,
    };
  }

  function toIsoDate(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return "";
    const [, month, day, year] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  function normalizeTime(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!match) return text;
    return `${match[1].padStart(2, "0")}:${match[2]}`;
  }

  function subtractMinutes(time, minutes) {
    const normalized = normalizeTime(time);
    const match = normalized.match(/^(\d{2}):(\d{2})$/);
    if (!match) return "";
    const total = Number(match[1]) * 60 + Number(match[2]);
    const shifted = (total - minutes + 24 * 60) % (24 * 60);
    const hours = String(Math.floor(shifted / 60)).padStart(2, "0");
    const mins = String(shifted % 60).padStart(2, "0");
    return `${hours}:${mins}`;
  }

  function earliestDateTime(items) {
    return items.slice().sort((a, b) => a.sort.localeCompare(b.sort))[0] || null;
  }

  function latestDateTime(items) {
    return items.slice().sort((a, b) => b.sort.localeCompare(a.sort))[0] || null;
  }

  function firstNonEmpty(rows, headers) {
    for (const row of rows) {
      for (const header of headers) {
        const value = csvValue(row, header);
        if (value) return value;
      }
    }
    return "";
  }

  function unique(items) {
    return [...new Set(items)];
  }

  function mapTripStatus(value) {
    const status = String(value || "").toLowerCase();
    if (status.includes("complete")) return "Completed";
    if (status.includes("progress") || status.includes("started")) return "In Progress";
    if (status.includes("cancel") || status.includes("delay")) return "Delayed";
    return "Upcoming";
  }

  function detectSoloType(rows) {
    const joined = rows
      .map((row) => `${csvValue(row, "Truck Filter")} ${csvValue(row, "Transit Operator Type")}`)
      .join(" ")
      .toLowerCase();
    if (joined.includes("solo2") || joined.includes("team")) return "Solo 2";
    return "Solo 1";
  }

  function makeId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function refreshRecapDays(clientId, importedRows, source) {
    const dates = unique(importedRows.map((row) => row.dailyDate));
    dates.forEach((date) => {
      const rowCount = state.recaps.filter((row) => row.clientId === clientId && row.dailyDate === date).length;
      const existing = state.recapDays.find((day) => day.clientId === clientId && day.date === date);
      if (existing) {
        existing.source = source;
        existing.importedAt = new Date().toISOString();
        existing.rowCount = rowCount;
      } else {
        state.recapDays.push({
          id: `day-${clientId}-${date}`,
          clientId,
          date,
          source,
          importedAt: new Date().toISOString(),
          rowCount,
        });
      }
    });
    state.recapDays.sort((a, b) => b.date.localeCompare(a.date) || clientName(a.clientId).localeCompare(clientName(b.clientId)));
  }

  function getPrimaryImportedDate(importedRows) {
    const counts = new Map();
    importedRows.forEach((row) => counts.set(row.dailyDate, (counts.get(row.dailyDate) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  }

  function resetPassword(userId) {
    const user = state.users.find((item) => item.id === userId);
    if (!user) return;
    const temp = `Ndk-${Math.random().toString(36).slice(2, 8)}${Math.floor(10 + Math.random() * 89)}`;
    user.password = temp;
    user.temporaryPassword = true;
    addAudit(`${getCurrentUser().name} reset ${user.name}'s password.`);
    saveState();
    render();
    showToast(`${user.name}'s temporary password is ${temp}`);
  }

  function takeShift(shiftId, user) {
    if (!user || user.role !== "dispatcher") {
      showToast("Only dispatchers can take over a shift.");
      return;
    }
    const shift = state.shifts.find((item) => item.id === shiftId);
    if (!shift) return;
    shift.assignedDispatcherId = user.id;
    shift.status = "In Progress";
    state.recaps.filter((row) => row.shiftId === shift.id).forEach((row) => {
      row.assignedDispatcherId = user.id;
      if (row.status === "Upcoming") row.status = "In Progress";
    });
    addAudit(`${user.name} took over ${shift.start}-${shift.end}.`);
    saveState();
    render();
    showToast("Shift takeover recorded.");
  }

  function markCleanRowsComplete(user) {
    const rows = visibleRecaps(user);
    let count = 0;
    rows.forEach((row) => {
      if (!row.issues && missingRequired(row).length === 0 && !row.lateFirstStop) {
        row.status = "Completed";
        count += 1;
      }
    });
    addAudit(`${getCurrentUser().name} completed ${count} clean recap rows.`);
    saveState();
    render();
    showToast(`${count} clean rows marked completed.`);
  }

  function copyStartingMessage(recapId) {
    const row = state.recaps.find((item) => item.id === recapId);
    if (!row) return;
    const message = makeStartingMessage(row);
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(message).then(() => showToast("Starting message copied."));
      return;
    }
    const input = document.createElement("textarea");
    input.value = message;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
    showToast("Starting message copied.");
  }

  function addAudit(text) {
    state.audit.unshift(text);
    state.audit = state.audit.slice(0, 8);
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2500);
  }
})();
