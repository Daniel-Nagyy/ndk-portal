(function () {
  const STORAGE_KEY = "ndkPortalState.v1";
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
    'my-shifts': '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    takeover: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
  };

  function getNavIcon(name) {
    return NAV_ICONS[name] || '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';
  }

  const seedState = {
    users: [
      {
        id: "u-admin",
        name: "Daniel Nagy",
        email: "manager@ndk-dispatch.com",
        role: "admin",
        clientId: null,
        timezone: "Africa/Cairo",
        status: "active",
        password: "admin123",
        temporaryPassword: false,
        lastLogin: "2026-06-15 16:45",
      },
      {
        id: "u-dispatcher",
        name: "Nora Dispatch",
        email: "dispatcher@ndk-dispatch.com",
        role: "dispatcher",
        clientId: "makowaves-logistics",
        timezone: "America/New_York",
        status: "active",
        password: "dispatch123",
        temporaryPassword: true,
        lastLogin: "2026-06-15 07:10",
      },
      {
        id: "u-dispatcher-2",
        name: "Mark Control",
        email: "mark@ndk-dispatch.com",
        role: "dispatcher",
        clientId: "makowaves-logistics",
        timezone: "America/Chicago",
        status: "active",
        password: "dispatch123",
        temporaryPassword: false,
        lastLogin: "2026-06-15 02:55",
      },
      {
        id: "u-owner",
        name: "makowaves Logistics Owner",
        email: "owner@makowaveslogistics.com",
        role: "owner",
        clientId: "makowaves-logistics",
        timezone: "America/New_York",
        status: "active",
        password: "owner123",
        temporaryPassword: true,
        lastLogin: "2026-06-14 19:22",
      },
    ],
    clients: [
      {
        id: "makowaves-logistics",
        name: "makowaves Logistics LLC",
        ownerUserId: "u-owner",
        fleetSize: 32,
        active: true,
        accountManager: "Daniel Nagy",
      },
      {
        id: "northline-carriers",
        name: "Northline Carriers",
        ownerUserId: null,
        fleetSize: 18,
        active: true,
        accountManager: "Daniel Nagy",
      },
    ],
    shifts: [
      {
        id: "s-early",
        clientId: "makowaves-logistics",
        assignedDispatcherId: "u-dispatcher",
        date: "2026-06-15",
        start: "03:00",
        end: "11:00",
        status: "In Progress",
        desk: "makowaves Dispatch team",
        handoff: "Five live blocks, one missing final arrival, and one fuel value below threshold.",
      },
      {
        id: "s-mid",
        clientId: "makowaves-logistics",
        assignedDispatcherId: "u-dispatcher-2",
        date: "2026-06-15",
        start: "07:00",
        end: "15:00",
        status: "Scheduled",
        desk: "makowaves Dispatch team",
        handoff: "Watch HOS pre-check for Jawuan Anderson and confirm BOL upload for Darwen Santiago.",
      },
      {
        id: "s-open",
        clientId: "makowaves-logistics",
        assignedDispatcherId: null,
        date: "2026-06-15",
        start: "15:00",
        end: "23:00",
        status: "Open",
        desk: "makowaves Dispatch team",
        handoff: "Evening coverage needs takeover. Review unresolved issues before 16:00.",
      },
    ],
   recaps: [],
    recapDays: [
      {
        id: "day-makowaves-logistics-2026-06-15",
        clientId: "makowaves-logistics",
        date: "2026-06-15",
        source: "Seed data",
        importedAt: "2026-06-15 17:00",
        rowCount: 6,
      },
    ],
    hosDrivers: [],
    announcements: [
      {
        id: "a-1",
        title: "makowaves Logistics coverage note",
        body: "Confirm final arrival home yard for all morning blocks before handoff.",
        audience: "all",
        date: "2026-06-15",
      },
      {
        id: "a-2",
        title: "HOS reminder",
        body: "Run shift pre-check before first yard check-in and log any risk in daily recap.",
        audience: "dispatchers",
        date: "2026-06-15",
      },
    ],
    audit: [
      "Daniel created makowaves Logistics owner credentials.",
      "Nora Dispatch updated Tony Walker issue notes.",
      "Mark Control accepted mid-shift coverage.",
    ],
  };

  let state = normalizeState(loadState());
  let session = loadSession();
  let currentView = defaultView(getCurrentUser());
  let recapFilter = "all";
  let netradyneAlerts = [];
  let netradyneSearchText = '';
let netradyneSortColumn = 'occurredAt'; // default sort by date newest first
let netradyneSortDir = 'desc';
  let selectedRecapDate = getDefaultRecapDate(getCurrentUser());
  let searchText = "";
  let ownerHosSearchText = "";
  let ownerHosStatusFilter = "";
  let ownerHosSortFilter = "onDutyFirst";
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
    render();
  });

  render();

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
  if (!user || user.role !== 'owner') return;
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
    render();
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
    state.lateItems = items;
    saveState();
    render();
  }

  function startOwnerHosAutoRefresh() {
    stopOwnerHosAutoRefresh();
    ownerHosAutoRefreshEnabled = true;
    ownerHosAutoRefreshTimer = setInterval(fetchGeotabDriversReadiness, ownerHosAutoRefreshMinutes * 60 * 1000);
    render();
  }

  function stopOwnerHosAutoRefresh() {
    if (ownerHosAutoRefreshTimer) clearInterval(ownerHosAutoRefreshTimer);
    ownerHosAutoRefreshTimer = null;
    ownerHosAutoRefreshEnabled = false;
    render();
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
  render();
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
      row.dailyDate = row.dailyDate || "2026-06-15";
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

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
      owner: "Owner",
      dispatcher: "Dispatcher",
    }[role] || role;
  }

  function clientName(clientId) {
    const client = state.clients.find((item) => item.id === clientId);
    return client ? client.name : "NDK Dispatch";
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
    return availableRecapDates(user)[0] || "2026-06-15";
  }

  function canSeeClient(user, clientId) {
    if (!user || user.role === "admin") return true;
    return user.clientId === clientId;
  }

  function ensureSelectedRecapDate(user) {
    const dates = availableRecapDates(user);
    if (!dates.length) {
      selectedRecapDate = "2026-06-15";
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

  function render() {
    const user = getCurrentUser();
    if (!user) {
      app.className = "app";
      app.innerHTML = renderLogin();
      return;
    }

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
            <div class="login-metrics" aria-label="NDK operations metrics">
              <div class="metric-tile"><strong>400+</strong><span>Drivers supported daily</span></div>
              <div class="metric-tile"><strong>35+</strong><span>Experienced dispatchers</span></div>
              <div class="metric-tile"><strong>80+</strong><span>Daily fleet reports</span></div>
            </div>
          </div>

          <div class="hint">Built to replace scattered Coda and Sheets workflows with role-based portal access.</div>
        </aside>

        <div class="login-panel-wrap">
          <form class="login-panel" data-form="login">
            <h2>Sign in</h2>
            <p class="hint">Managers create accounts first. New users can change their temporary password from settings.</p>

            <div class="field">
              <label for="email">Email</label>
              <input id="email" name="email" type="email" autocomplete="username" required value="manager@ndk-dispatch.com" />
            </div>
            <div class="field">
              <label for="password">Password</label>
              <input id="password" name="password" type="password" autocomplete="current-password" required value="admin123" />
            </div>

            <div class="login-actions">
              <button class="btn btn-primary" type="submit">Sign in</button>
              <div class="demo-accounts" aria-label="Demo account shortcuts">
                <button class="quick-login" type="button" data-demo-login="admin" data-role="admin">Admin</button>
                <button class="quick-login" type="button" data-demo-login="dispatcher" data-role="dispatcher">Dispatcher</button>
                <button class="quick-login" type="button" data-demo-login="owner" data-role="owner">Owner</button>
              </div>
              <button class="btn btn-secondary" type="button" data-action="reset-demo">Reset demo passwords</button>
            </div>

            <div class="login-note">Prototype credentials are stored locally in this browser only. Resetting demo passwords clears local demo changes and imports.</div>
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

  function todayLabel() {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date("2026-06-15T12:00:00"));
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
        { id: "owner-overview", label: "Owner Overview", icon: "owner-overview" },
        { id: "owner-recap", label: "Daily Recap", icon: "recap" },
        { id: 'netradyne-dashboard', label: 'Netradyne Alerts', icon: 'netradyne-dashboard' },
        { id: "owner-issues", label: "Issues", icon: "owner-issues" },
        ...shared,
      ];
    }
    return [
      { id: "my-shifts", label: "My Shifts", icon: "my-shifts" },
      { id: "dispatcher-recap", label: "Daily Recap", icon: "recap" },
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
    return applySearch(rows, ["driverAssigned", "tripId", "blockId", "truck", "issues"]);
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
          <button class="kpi-card kpi-card--issues" type="button" data-view="owner-issues" aria-label="View open issues">
            <span class="kpi-icon">📋</span>
            <strong class="kpi-value ${metrics.openIssues > 0 ? 'kpi-amber' : 'kpi-green'}">${metrics.openIssues}</strong>
            <span class="kpi-label">Open Issues</span>
          </button>
          <button class="kpi-card kpi-card--netradyne" type="button" data-view="netradyne-dashboard" aria-label="View Netradyne alerts">
            <span class="kpi-icon">🔔</span>
            <strong class="kpi-value">${netradyneAlerts.length}</strong>
            <span class="kpi-label">Safety Alerts</span>
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

        <!-- LATE ITEMS -->
        <section class="mobile-section">
          <div class="mobile-section-head">
            <div class="section-head-text">
              <div class="section-head-icon late-icon">📦</div>
              <div>
                <h3>Amazon Relay Late Drivers</h3>
                <p>Drivers who are running late.</p>
              </div>
            </div>
            <span class="status-pill-badge ${(state.lateItems && state.lateItems.length) ? 'badge-amber' : 'badge-green'}">${(state.lateItems && state.lateItems.length) ? `${state.lateItems.length} late` : '✓ Clear'}</span>
          </div>
          ${renderLateItemsCards(state.lateItems || [])}
        </section>

        <!-- DAILY RECAP -->
        <section class="mobile-section">
          <div class="mobile-section-head">
            <div class="section-head-text">
              <div class="section-head-icon recap-icon">📅</div>
              <div>
                <h3>Daily Recap</h3>
                <p>${escapeHtml(formatDateLabel(selectedRecapDate))} &mdash; ${day.rowCount} rows</p>
              </div>
            </div>
            <button class="mobile-section-btn" type="button" data-view="owner-recap">Open full ›</button>
          </div>
          ${renderRecapDayControls(user, false)}
          ${renderMobileRecapCards(rows.slice(0, 5))}
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
        <h2>Dispatcher view of Daily Recap</h2>
        <p>Wide operating table for trip status, time checks, HOS, comments, BOL, block deep dive, and starting messages.</p>
      </div>
      <div class="actions-row">
        ${renderRecapTabs(user)}
        ${editable ? `<button class="btn btn-secondary" type="button" data-action="mark-complete-visible">Complete clean rows</button>` : ""}
      </div>
    </div>

    ${renderRecapDayControls(user, editable)}

    <div class="panel">
      <div class="panel-header">
        <div>
          <h3>Daily recap for ${escapeHtml(formatDateLabel(selectedRecapDate))}</h3>
          <p>${rows.length} rows visible - ${day.rowCount} total for this day - source: ${escapeHtml(day.source)}.</p>
        </div>
        <span class="pill ${editable ? "green" : "blue"}">${editable ? "Editable" : "Owner view"}</span>
      </div>
      <div class="panel-body">
        <!-- Desktop table (hidden on mobile) -->
        <div class="recap-table-desktop">
          ${renderRecapTable(rows, editable)}
        </div>
        <!-- Mobile card list (hidden on desktop) -->
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
          <span class="field-label">Daily recap day</span>
          <select class="table-control date-select" data-recap-date>
            ${dates.map((date) => `<option value="${date}" ${date === selectedRecapDate ? "selected" : ""}>${escapeHtml(formatDateLabel(date))}</option>`).join("")}
          </select>
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
    if (!rows.length) return `<div class="empty-state">No recap rows match this view.</div>`;
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
              <th>DVIR</th>
              <th>Fuel</th>
              <th>On Duty Time</th>
              <th>Requested Start</th>
              <th>Stop 1 upcoming</th>
              <th>Actual Check-In</th>
              <th>Scheduled Final</th>
              <th>Final Arrival Home Yard</th>
              <th>Driver Log Off</th>
              <th>HOS Check</th>
              <th>Late First Stop?</th>
              <th>Issues / Comments</th>
              <th>BOL</th>
              <th>Block Deep Dive</th>
              <th>Starting Message</th>
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
  if (!rows.length) return `<div class="empty-state">No recap rows match this view.</div>`;

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
                <span class="rcv-expand-icon">▼</span>
              </div>
            </div>
            <div class="recap-details" style="display:none;">
              ${field('Status', row.status)}
              ${field('Trip ID', row.tripId)}
              ${field('Block ID', row.blockId)}
              ${field('VRIDs', (row.vrids && row.vrids.length) ? row.vrids.join(', ') : '–')}
              ${field('Solo', row.solo)}
              ${field('Truck', row.truck)}
              ${field('DVIR', row.dvir)}
              ${field('Fuel', row.fuel)}
              ${field('On Duty', row.onDuty)}
              ${field('Requested Start', row.requestedStart)}
              ${field('Stop 1 upcoming', row.stopOneupcoming)}
              ${field('Actual Check‑In', row.actualCheckIn)}
              ${field('Scheduled Final', row.scheduledFinal)}
              ${field('Final Arrival Home', row.finalArrivalHome)}
              ${field('Driver Log Off', row.driverLogOff)}
              ${field('HOS Check', row.hosCheck)}
              ${field('Late First Stop', row.lateFirstStop ? 'Yes' : 'No')}
              ${field('Issues', row.issues || 'None')}
              ${field('Block Deep Dive', row.blockDeepDive || '–')}
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
        <td class="vrids">${renderVrids(row.vrids)}</td>
        <td>${editable ? renderSelectControl(row, "solo", ["Solo 1", "Solo 2"]) : `<span class="pill blue">${escapeHtml(row.solo)}</span>`}</td>
        <td class="${missing.includes("truck") ? "cell-required" : ""}">${control("truck")}</td>
        <td>${editable ? renderSelectControl(row, "dvir", ["Not Started", "Pre Trip", "Post Trip", "Completed"]) : `<span class="pill blue">${escapeHtml(row.dvir)}</span>`}</td>
        <td class="${missing.includes("fuel") ? "cell-required" : ""}">${control("fuel")}</td>
        <td class="${missing.includes("onDuty") ? "cell-required" : ""}">${control("onDuty")}</td>
        <td>${control("requestedStart")}</td>
        <td>${control("stopOneupcoming")}</td>
        <td class="${missing.includes("actualCheckIn") ? "cell-required" : ""}">${control("actualCheckIn")}</td>
        <td>${control("scheduledFinal")}</td>
        <td class="${missing.includes("finalArrivalHome") ? "cell-required" : ""}">${control("finalArrivalHome")}</td>
        <td>${control("driverLogOff")}</td>
        <td>${editable ? renderSelectControl(row, "hosCheck", ["HOS - Shift Pre Check", "30 Minutes Completed", "Break upcoming", "HOS Risk"]) : `<span class="pill green">${escapeHtml(row.hosCheck)}</span>`}</td>
        <td>${editable ? `<input class="toggle" type="checkbox" data-recap-field="lateFirstStop" data-recap-id="${row.id}" ${row.lateFirstStop ? "checked" : ""} />` : row.lateFirstStop ? `<span class="pill red">Yes</span>` : `<span class="pill gray">No</span>`}</td>
        <td class="${row.issues ? "" : "cell-required"}">${editable ? `<textarea class="table-control" data-recap-field="issues" data-recap-id="${row.id}">${escapeHtml(row.issues)}</textarea>` : `<span class="compact">${escapeHtml(row.issues || "No comments")}</span>`}</td>
        <td>${editable ? renderSelectControl(row, "bol", ["Pending", "Uploaded", "Not Required", "Missing"]) : `<span class="pill ${row.bol === "Uploaded" ? "green" : "amber"}">${escapeHtml(row.bol)}</span>`}</td>
        <td>${editable ? `<textarea class="table-control" data-recap-field="blockDeepDive" data-recap-id="${row.id}">${escapeHtml(row.blockDeepDive)}</textarea>` : `<span class="compact">${escapeHtml(row.blockDeepDive || "No deep dive")}</span>`}</td>
        <td><button class="btn btn-primary btn-small" type="button" data-action="copy-starting-message" data-recap-id="${row.id}">Copy message</button></td>
      </tr>
    `;
  }

  function renderVrids(vrids) {
    const items = Array.isArray(vrids) ? vrids.filter(Boolean) : [];
    if (!items.length) return `<span class="muted">No VRIDs</span>`;
    const visible = items.slice(0, 8);
    const remaining = items.length - visible.length;
    return `
      <div class="vrid-list">
        ${visible.map((vrid) => `<span class="vrid-chip">${escapeHtml(vrid)}</span>`).join("")}
        ${remaining > 0 ? `<span class="vrid-chip more">+${remaining}</span>` : ""}
      </div>
    `;
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
    return ["truck", "fuel", "onDuty", "actualCheckIn", "finalArrivalHome"].filter((field) => !String(row[field] || "").trim());
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
    return `Hello ${row.driverAssigned}, you are assigned to trip ${row.tripId} / block ${row.blockId}. Requested yard time is ${row.requestedStart}, first upcoming arrival is ${row.stopOneupcoming}, truck ${row.truck || "TBD"}. Please complete HOS pre-check and ${row.dvir || "DVIR"} before departure.`;
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
            <input name="date" type="date" value="2026-06-15" required />
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
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div class="field">
            <label>Client</label>
            <select name="clientId">
              <option value="">NDK Dispatch</option>
              ${state.clients.map((client) => `<option value="${client.id}">${escapeHtml(client.name)}</option>`).join("")}
            </select>
          </div>
          <div class="field wide">
            <label>Temporary password</label>
            <input name="password" required value="Welcome123" />
          </div>
        </div>
        <div class="inline-form-actions">
          <button class="btn btn-primary" type="submit">Create user</button>
        </div>
      </form>
    `;
  }

  function renderClientsPage() {
    return `
      <div class="section-title">
        <div>
          <h2>Client access</h2>
          <p>Owner accounts are tied to clients so they only see their shifts, recaps, and performance data.</p>
        </div>
      </div>

      <div class="grid-2">
        <div class="panel">
          <div class="panel-header">
            <div>
              <h3>Clients</h3>
              <p>${state.clients.length} configured owner workspaces.</p>
            </div>
          </div>
          <div class="panel-body">
            <div class="mini-list">
              ${state.clients
        .map(
          (client) => `
                    <div class="mini-item">
                      <div>
                        <strong>${escapeHtml(client.name)}</strong>
                        <span>${client.fleetSize} trucks · Account manager ${escapeHtml(client.accountManager)}</span>
                      </div>
                      <span class="pill ${client.active ? "green" : "gray"}">${client.active ? "Active" : "Inactive"}</span>
                    </div>
                  `
        )
        .join("")}
            </div>
          </div>
        </div>
        <form class="form-card" data-form="client">
          <h3>Add client</h3>
          <p>Create the company workspace first, then register owner accounts.</p>
          <div class="form-grid">
            <div class="field wide">
              <label>Company name</label>
              <input name="name" required placeholder="Carrier LLC" />
            </div>
            <div class="field">
              <label>Fleet size</label>
              <input name="fleetSize" type="number" min="1" value="10" required />
            </div>
            <div class="field">
              <label>Account manager</label>
              <input name="accountManager" value="Daniel Nagy" required />
            </div>
          </div>
          <div class="inline-form-actions">
            <button class="btn btn-primary" type="submit">Create client</button>
          </div>
        </form>
      </div>
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
            <input name="date" type="date" value="2026-06-15" required />
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

  async function installOwnerApp() {
    if (!installPromptEvent) {
      showToast("Install prompt is not available in this browser yet.");
      return;
    }
    installPromptEvent.prompt();
    await installPromptEvent.userChoice.catch(() => null);
    installPromptEvent = null;
    render();
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
      if (currentView === "owner-hos" && getCurrentUser()?.role === "owner") {
        await fetchGeotabDriversReadiness();
      }
      return;
    }

    const demo = event.target.closest("[data-demo-login]");
    if (demo) {
      const role = demo.dataset.demoLogin;
      const map = {
        admin: ["manager@ndk-dispatch.com", "admin123"],
        dispatcher: ["dispatcher@ndk-dispatch.com", "dispatch123"],
        owner: ["owner@makowaveslogistics.com", "owner123"],
      };
      const [email, password] = map[role];
      const emailInput = app.querySelector("#email");
      const passwordInput = app.querySelector("#password");
      if (emailInput && passwordInput) {
        emailInput.value = email;
        passwordInput.value = password;
      }
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
  const card = recapToggle.closest('.recap-card-v2');
  if (card) {
    const details = card.querySelector('.recap-details');
    const icon = card.querySelector('.rcv-expand-icon');
    if (details) {
      const isOpen = details.style.display === 'grid';
      details.style.display = isOpen ? 'none' : 'grid';
      if (icon) icon.textContent = isOpen ? '▼' : '▲';
    }
  }
  return;
}
    const action = event.target.closest("[data-action]");
    if (!action) return;
    const user = getCurrentUser();
    switch (action.dataset.action) {
      case "logout":
        session = null;
        saveSession();
        currentView = "login";
        render();
        showToast("Signed out.");
        break;
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
      case "focus-create-shift":
        document.getElementById("create-shift")?.scrollIntoView({ behavior: "smooth", block: "center" });
        break;
      case "enable-owner-notifications":
        enableOwnerNotifications(user);
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

    const recapField = event.target.closest("[data-recap-field]");
    if (recapField) {
      const row = state.recaps.find((item) => item.id === recapField.dataset.recapId);
      if (!row) return;
      const field = recapField.dataset.recapField;
      row[field] = recapField.type === "checkbox" ? recapField.checked : recapField.value;
      addAudit(`${getCurrentUser().name} updated ${row.driverAssigned} ${field}.`);
      saveState();
      render();
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

  function login(email, password) {
    const normalized = String(email || "").trim().toLowerCase();
    const user = state.users.find((item) => item.email.toLowerCase() === normalized);
    if (!user || user.password !== password) {
      showToast("Email or password is incorrect. Use Reset demo passwords if local demo data changed.");
      return;
    }
    if (user.status !== "active") {
      showToast("This account is disabled.");
      return;
    }
    user.lastLogin = "2026-06-15 17:00";
    session = { userId: user.id };
    currentView = defaultView(user);
    saveState();
    saveSession();
    render();
    if (user.role === "owner") {
      fetchGeotabDriversReadiness();
    }
    showToast(`Welcome, ${user.name}.`);
  }

  function updatePassword(data) {
    const user = getCurrentUser();
    if (!user) return;
    if (data.currentPassword !== user.password) {
      showToast("Current password is incorrect.");
      return;
    }
    if (data.newPassword !== data.confirmPassword) {
      showToast("New passwords do not match.");
      return;
    }
    user.password = data.newPassword;
    user.temporaryPassword = false;
    addAudit(`${user.name} changed password.`);
    saveState();
    render();
    showToast("Password updated.");
  }

  function createUser(data, form) {
    const email = data.email.trim().toLowerCase();
    if (state.users.some((user) => user.email.toLowerCase() === email)) {
      showToast("A user with that email already exists.");
      return;
    }
    const user = {
      id: `u-${Date.now()}`,
      name: data.name.trim(),
      email,
      role: data.role,
      clientId: data.clientId || null,
      timezone: "America/New_York",
      status: "active",
      password: data.password,
      temporaryPassword: true,
      lastLogin: "",
    };
    state.users.push(user);
    addAudit(`${getCurrentUser().name} registered ${user.name}.`);
    saveState();
    form.reset();
    render();
    showToast(`Created ${user.name} with temporary credentials.`);
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

  function createClient(data, form) {
    const id = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (state.clients.some((client) => client.id === id)) {
      showToast("That client already exists.");
      return;
    }
    state.clients.push({
      id,
      name: data.name.trim(),
      ownerUserId: null,
      fleetSize: Number(data.fleetSize),
      active: true,
      accountManager: data.accountManager.trim(),
    });
    addAudit(`${getCurrentUser().name} created client ${data.name}.`);
    saveState();
    form.reset();
    render();
    showToast("Client created.");
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
      const stopOneTimes = groupRows.map((row) => dateTimeFromCsv(row, "Stop 1 upcoming Arrival Date", "Stop 1 upcoming Arrival Time")).filter(Boolean);
      const actualStopOneTimes = groupRows.map((row) => dateTimeFromCsv(row, "Stop 1 Actual Arrival Date", "Stop 1 Actual Arrival Time")).filter(Boolean);
      const finalupcomingTimes = groupRows.map((row) => dateTimeFromCsv(row, "Stop 2 upcoming Arrival Date", "Stop 2 upcoming Arrival Time")).filter(Boolean);
      const earliestStopOne = earliestDateTime(stopOneTimes);
      const earliestActual = earliestDateTime(actualStopOneTimes);
      const latestFinal = latestDateTime(finalupcomingTimes);
      const dailyDate = earliestStopOne?.date || selectedRecapDate || "2026-06-15";
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
        requestedStart: earliestStopOne ? subtractMinutes(earliestStopOne.time, 25) : "",
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
    user.password = "Welcome123";
    user.temporaryPassword = true;
    addAudit(`${getCurrentUser().name} reset ${user.name}'s password.`);
    saveState();
    render();
    showToast(`${user.name}'s temporary password is Welcome123.`);
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
