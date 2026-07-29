// geotab.mjs — Geotab API auth + HOS driver-readiness computation.
// Extracted from server.mjs so both the API endpoint and the background
// alert engine can compute readiness from a set of account credentials.

const DEFAULT_SERVER = "my.geotab.com";
const AUTH_CACHE_MS = 30 * 60 * 1000;

export function simplifyError(err) {
  if (!err) return "Unknown error";
  const msg = String(err.message || err);
  if (msg.includes("fetch failed")) return "Network/API request failed";
  return msg;
}

async function geotabCall(method, params, server = DEFAULT_SERVER) {
  const url = `https://${server}/apiv1`;
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, params, id: 1, jsonrpc: "2.0" })
    });
  } catch (error) {
    throw new Error(`${method}: network request failed (${error.message || error})`);
  }
  if (!response.ok) {
    let bodyText = "";
    try { bodyText = await response.text(); } catch (_) {}
    throw new Error(`${method}: HTTP ${response.status} ${response.statusText}${bodyText ? ` - ${bodyText.slice(0, 200)}` : ""}`);
  }
  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error(`${method}: invalid JSON response`);
  }
  if (data.error) {
    throw new Error(`${method}: ${data.error.message || "Geotab API error"}`);
  }
  return data.result;
}

async function withRetry(fn, options = {}) {
  const retries = Number(options.retries || 0);
  const delayMs = Number(options.delayMs || 0);
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

async function geotabCallWithRetry(method, params, options = {}) {
  return withRetry(() => geotabCall(method, params, options.server || DEFAULT_SERVER), options);
}

const authCache = new Map();

async function authenticate(credentials, options = {}) {
  if (!credentials || !credentials.database || !credentials.userName || !credentials.password) {
    throw new Error("Missing Geotab credentials");
  }
  const server = credentials.server || DEFAULT_SERVER;
  const cacheKey = `${server}|${credentials.database}|${credentials.userName}`;
  const cached = authCache.get(cacheKey);
  if (!options.force && cached && Date.now() - cached.createdAt < AUTH_CACHE_MS) {
    return cached.auth;
  }
  const auth = await geotabCallWithRetry("Authenticate", {
    database: credentials.database,
    userName: credentials.userName,
    password: credentials.password
  }, { retries: 1, delayMs: 400, server });
  authCache.set(cacheKey, { auth, createdAt: Date.now() });
  return auth;
}

function parseDurationToMinutes(value) {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    if (Math.abs(value) > 100000) {
      const minutes = value / 60000;
      return Math.floor(Math.abs(minutes)) * (value < 0 ? -1 : 1);
    }
    return Math.min(value, 10000);
  }
  const text = String(value).trim();
  if (!text) return null;
  const isoMatch = text.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
  if (isoMatch) {
    const days = Number(isoMatch[1] || 0);
    const hours = Number(isoMatch[2] || 0);
    const minutes = Number(isoMatch[3] || 0);
    const seconds = Number(isoMatch[4] || 0);
    return Math.floor(days * 24 * 60 + hours * 60 + minutes + seconds / 60);
  }
  const spanMatch = text.match(/^(-?)(?:(\d+)\.)?(\d{1,3}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?$/);
  if (spanMatch) {
    const sign = spanMatch[1] ? -1 : 1;
    const days = Number(spanMatch[2] || 0);
    const hours = Number(spanMatch[3] || 0);
    const minutes = Number(spanMatch[4] || 0);
    const seconds = Number(spanMatch[5] || 0);
    const fractional = spanMatch[6] ? Number(`0.${spanMatch[6]}`) : 0;
    const totalMinutes = ((days * 24 + hours) * 60) + minutes + ((seconds + fractional) / 60);
    return sign * Math.floor(totalMinutes);
  }
  const number = Number(text.replace(/[^0-9.-]+/g, ""));
  if (Number.isFinite(number)) {
    if (Math.abs(number) > 100000) {
      return Math.floor(number / 60000);
    }
    return Math.floor(number);
  }
  return null;
}

function formatMinutes(minutes) {
  if (minutes == null || !Number.isFinite(minutes)) return "--";
  const sign = minutes < 0 ? -1 : 1;
  const abs = Math.abs(Math.round(minutes));
  const hrs = Math.floor(abs / 60);
  const mins = abs % 60;
  return `${sign < 0 ? "-" : ""}${String(hrs).padStart(1, "0")}:${String(mins).padStart(2, "0")}`;
}

function safeDate(value) {
  if (value == null) return new Date(NaN);
  if (typeof value === "string") {
    const msMatch = value.match(/\/Date\((\d+)(?:[+-]\d+)?\)\//);
    if (msMatch) value = Number(msMatch[1]);
  }
  let num = Number(value);
  if (Number.isFinite(num)) {
    if (num < 1e12) num *= 1000;
    return new Date(num);
  }
  return new Date(value);
}

function availabilityTypeMap(item) {
  const map = {};
  const list = Array.isArray(item?.availabilities) ? item.availabilities : [];
  for (const entry of list) {
    const key = String(entry?.type || "").toLowerCase();
    if (!key) continue;
    map[key] = parseDurationToMinutes(entry?.duration);
  }
  return map;
}

function extractCycleAvailableTomorrowMinutes(item) {
  if (!item || typeof item !== "object") return null;
  const candidates = item.CycleAvailabilities ?? item.cycleAvailabilities;
  if (candidates == null) return null;
  if (Array.isArray(candidates)) {
    const first = candidates[0];
    if (first && typeof first === "object") {
      return parseDurationToMinutes(first.available ?? first.Available ?? first.duration ?? first.Duration);
    }
    return parseDurationToMinutes(first);
  }
  return parseDurationToMinutes(candidates);
}

async function getDriverAvailability(credentials, userId, server) {
  const searches = [
    { userSearch: { id: userId } },
    { UserSearch: { Id: userId } },
    { userSearch: { Id: userId } },
    { UserSearch: { id: userId } }
  ];
  let lastError = null;
  for (const search of searches) {
    try {
      const result = await geotabCallWithRetry("Get", {
        typeName: "DutyStatusAvailability",
        credentials,
        search
      }, { retries: 2, delayMs: 400, server });
      if (Array.isArray(result) && result.length) {
        const item = result[0];
        const typed = availabilityTypeMap(item);
        const cycleRemainingMinutes = typed.cycle ?? parseDurationToMinutes(item.Cycle ?? item.cycle);
        const drivingMinutes = typed.driving ?? parseDurationToMinutes(item.Driving ?? item.driving);
        const breakMinutes = typed.break ?? typed.rest ?? parseDurationToMinutes(item.Break ?? item.break ?? item.drivingBreakDuration);
        const dutyMinutes = typed.duty ?? parseDurationToMinutes(item.Duty ?? item.duty);
        const workdayMinutes = typed.workday ?? parseDurationToMinutes(item.Workday ?? item.workday ?? item.Duty ?? item.duty);
        const cycleTomorrowMinutes = extractCycleAvailableTomorrowMinutes(item);
        return {
          cycleRemainingMinutes,
          cycleRemainingDisplay: formatMinutes(cycleRemainingMinutes),
          cycleTomorrowMinutes,
          cycleTomorrowDisplay: formatMinutes(cycleTomorrowMinutes),
          drivingMinutes,
          drivingDisplay: formatMinutes(drivingMinutes),
          dutyMinutes,
          dutyDisplay: formatMinutes(dutyMinutes),
          workdayMinutes,
          workdayDisplay: formatMinutes(workdayMinutes),
          breakMinutes,
          breakDisplay: formatMinutes(breakMinutes),
          cycleRaw: item,
          availabilityError: null
        };
      }
    } catch (error) {
      lastError = error;
    }
  }
  return {
    cycleRemainingMinutes: null, cycleRemainingDisplay: "--",
    cycleTomorrowMinutes: null, cycleTomorrowDisplay: "--",
    drivingMinutes: null, drivingDisplay: "--",
    dutyMinutes: null, dutyDisplay: "--",
    workdayMinutes: null, workdayDisplay: "--",
    breakMinutes: null, breakDisplay: "--",
    cycleRaw: null,
    availabilityError: lastError ? simplifyError(lastError) : null
  };
}

async function getDriverLogs(credentials, userId, server) {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const searches = [
    { search: { fromDate: weekAgo.toISOString(), toDate: now.toISOString(), userSearch: { id: userId } } },
    { search: { fromDate: weekAgo.toISOString(), toDate: now.toISOString(), userSearch: { Id: userId } } }
  ];
  let lastError = null;
  for (const item of searches) {
    try {
      const result = await geotabCallWithRetry("Get", {
        typeName: "DutyStatusLog",
        credentials,
        search: item.search,
        resultsLimit: 500
      }, { retries: 3, delayMs: 500, server });
      if (Array.isArray(result) && result.length) {
        return { logs: result, logsError: null };
      }
    } catch (error) {
      lastError = error;
    }
  }
  return { logs: [], logsError: lastError ? simplifyError(lastError) : null };
}

function calculateCycleReset(logs, now) {
  const resetStatuses = new Set(["OFF", "SB", "PC"]);
  if (!Array.isArray(logs) || logs.length === 0) {
    return { cycleResetMinutes: null, cycleResetDisplay: "--" };
  }
  const validLogs = logs
    .filter((log) => log && log.dateTime && log.status)
    .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
  if (!validLogs.length) {
    return { cycleResetMinutes: null, cycleResetDisplay: "--" };
  }
  const latest = validLogs[0];
  if (!resetStatuses.has(latest.status)) {
    return { cycleResetMinutes: null, cycleResetDisplay: "--" };
  }
  let resetStart = new Date(latest.dateTime);
  for (let i = 1; i < validLogs.length; i += 1) {
    if (resetStatuses.has(validLogs[i].status)) {
      resetStart = new Date(validLogs[i].dateTime);
    } else {
      break;
    }
  }
  const elapsedMinutes = Math.floor((now - resetStart) / (1000 * 60));
  const remainingMinutes = Math.max(0, (34 * 60) - elapsedMinutes);
  return { cycleResetMinutes: remainingMinutes, cycleResetDisplay: remainingMinutes <= 0 ? "Completed" : formatMinutes(remainingMinutes) };
}

function formatDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, month: "short", day: "numeric" });
}

function buildRow(user, logs, now, availability = {}, extraNote = null) {
  const allowedStatuses = new Set(["OFF", "SB", "ON", "D", "PC", "YM"]);
  const MAX_LOG_AGE_MS = 30 * 24 * 60 * 60 * 1000;
  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.name || user.userName || "Unknown Driver";
  const base = {
    id: user.id,
    name,
    userName: user.userName || "",
    cycleRemainingMinutes: availability.cycleRemainingMinutes ?? null,
    cycleRemainingDisplay: availability.cycleRemainingDisplay ?? "--",
    cycleTomorrowDisplay: availability.cycleTomorrowDisplay ?? "--",
    drivingDisplay: availability.drivingDisplay ?? "--",
    dutyDisplay: availability.dutyDisplay ?? "--",
    workdayDisplay: availability.workdayDisplay ?? "--",
    breakDisplay: availability.breakDisplay ?? "--",
    cycleResetMinutes: null,
    cycleResetDisplay: "--",
    cycleRaw: availability.cycleRaw ?? null
  };

  if (!Array.isArray(logs) || logs.length === 0) {
    return { ...base, currentStatus: "No recent logs", readiness: "NO LOGS", lastRestStart: "--", lastRestStartIso: null, minutesLeft: null, remainingDisplay: "--", note: extraNote || "No logs found in the last 7 days." };
  }

  let filtered = logs.filter((log) => {
    const validRecord = log.eventRecordStatus === 1 || log.eventRecordStatus === "1" || log.eventRecordStatus == null;
    return validRecord && log.isIgnored !== true && allowedStatuses.has(log.status);
  });
  filtered = filtered.filter((log) => {
    const logTime = safeDate(log.dateTime).getTime();
    return !isNaN(logTime) && (now.getTime() - logTime <= MAX_LOG_AGE_MS);
  });

  if (filtered.length === 0) {
    return { ...base, currentStatus: "No recent logs", readiness: "NO LOGS", lastRestStart: "--", lastRestStartIso: null, minutesLeft: null, remainingDisplay: "--", note: extraNote || "No logs within the last 30 days." };
  }

  const cycleReset = calculateCycleReset(filtered, now);
  filtered.sort((a, b) => safeDate(b.dateTime) - safeDate(a.dateTime));
  const latest = filtered[0];

  if (!allowedStatuses.has(latest.status) || (latest.status !== "OFF" && latest.status !== "SB" && latest.status !== "PC")) {
    let statusSince = new Date(latest.dateTime);
    for (let i = 1; i < filtered.length; i += 1) {
      if (filtered[i].status === latest.status) statusSince = new Date(filtered[i].dateTime);
      else break;
    }
    return { ...base, cycleResetMinutes: cycleReset.cycleResetMinutes, cycleResetDisplay: cycleReset.cycleResetDisplay, currentStatus: latest.status, statusSinceIso: statusSince.toISOString(), statusSinceDisplay: formatDate(statusSince), readiness: "NOT READY", lastRestStart: "--", lastRestStartIso: null, minutesLeft: null, remainingDisplay: "--", note: extraNote || `Current duty status is ${latest.status}.` };
  }

  let restStart = new Date(latest.dateTime);
  for (let i = 1; i < filtered.length; i += 1) {
    if (filtered[i].status === "OFF" || filtered[i].status === "SB" || filtered[i].status === "PC") {
      restStart = new Date(filtered[i].dateTime);
    } else {
      break;
    }
  }

  const elapsedMinutes = Math.floor((now.getTime() - restStart.getTime()) / 60000);
  const remainingMinutes = Math.max(0, 600 - elapsedMinutes);

  if (remainingMinutes <= 0) {
    return { ...base, cycleResetMinutes: cycleReset.cycleResetMinutes, cycleResetDisplay: cycleReset.cycleResetDisplay, currentStatus: latest.status, readiness: "READY", lastRestStart: formatDate(restStart), lastRestStartIso: restStart.toISOString(), minutesLeft: 0, remainingDisplay: "Completed", note: extraNote || "Completed required 10-hour rest period." };
  }

  return { ...base, cycleResetMinutes: cycleReset.cycleResetMinutes, cycleResetDisplay: cycleReset.cycleResetDisplay, currentStatus: latest.status, readiness: "NOT READY", lastRestStart: formatDate(restStart), lastRestStartIso: restStart.toISOString(), minutesLeft: remainingMinutes, remainingDisplay: formatMinutes(remainingMinutes), note: extraNote || `Needs ${formatMinutes(remainingMinutes)} to complete 10-hour rest.` };
}

// Orchestrator: authenticate, fetch drivers, compute a readiness row for each.
// credentials = { server, database, username, password }
export async function computeReadiness(credentials) {
  const server = credentials.server || DEFAULT_SERVER;
  const auth = await authenticate({
    database: credentials.database,
    userName: credentials.username,
    password: credentials.password,
    server
  });
  const geotabCredentials = auth.credentials;

  const users = await geotabCallWithRetry("Get", { typeName: "User", credentials: geotabCredentials }, { retries: 2, delayMs: 400, server });

  const now = new Date();
  const seen = new Set();
  const drivers = (Array.isArray(users) ? users : []).filter((user) => {
    if (!user || !user.id || !user.isDriver) return false;
    // Geotab keeps archived/terminated drivers in the User list but sets activeTo
    // in the past (active drivers use a far-future sentinel like 2050). Excluding
    // them matches the driver count shown in Geotab's own HOS view.
    const activeTo = user.activeTo ? safeDate(user.activeTo) : null;
    if (activeTo && !Number.isNaN(activeTo.getTime()) && activeTo.getTime() < now.getTime()) return false;
    const key = typeof user.id === "string" ? user.id : JSON.stringify(user.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const rows = await Promise.all(drivers.map(async (user) => {
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.name || user.userName || "Unknown Driver";
    const [logsResult, availability] = await Promise.all([
      getDriverLogs(geotabCredentials, user.id, server),
      getDriverAvailability(geotabCredentials, user.id, server)
    ]);

    let finalLogs = logsResult.logs;
    let finalLogsError = logsResult.logsError;
    const availabilityError = availability.availabilityError || null;
    const MAX_LOG_AGE_MS = 30 * 24 * 60 * 60 * 1000;
    finalLogs = (finalLogs || []).filter((log) => {
      const logTime = new Date(log.dateTime).getTime();
      return !isNaN(logTime) && (now.getTime() - logTime <= MAX_LOG_AGE_MS);
    });
    if (finalLogsError) {
      try {
        const thirtyDaysAgo = new Date(now.getTime() - MAX_LOG_AGE_MS);
        finalLogs = await geotabCallWithRetry("Get", {
          typeName: "DutyStatusLog",
          credentials: geotabCredentials,
          search: { userSearch: { id: user.id }, fromDate: thirtyDaysAgo.toISOString() }
        }, { retries: 1, delayMs: 700, server });
        finalLogsError = null;
      } catch (error) {
        finalLogsError = simplifyError(error);
      }
    }

    if (finalLogsError) {
      return {
        id: user.id, driverName: name, status: "Error", vehicle: null, activeTripId: null, lastStatusChange: null,
        breakTime: availability.breakDisplay, driving: availability.drivingDisplay, duty: availability.dutyDisplay,
        workday: availability.workdayDisplay, cycle: availability.cycleRemainingDisplay, updatedAt: new Date().toISOString(),
        clientId: null, currentStatus: "Error", cycleRemainingDisplay: availability.cycleRemainingDisplay,
        cycleTomorrowDisplay: availability.cycleTomorrowDisplay, drivingDisplay: availability.drivingDisplay,
        dutyDisplay: availability.dutyDisplay, workdayDisplay: availability.workdayDisplay, breakDisplay: availability.breakDisplay,
        cycleResetDisplay: availability.cycleResetDisplay ?? "--",
        note: finalLogsError ? `Logs: ${finalLogsError} ${availabilityError ? `| Avail: ${availabilityError}` : ""}` : null,
        statusSinceDisplay: null, statusSinceIso: null, readiness: "NO LOGS"
      };
    }

    const row = buildRow(user, finalLogs, now, availability, availabilityError ? `Availability: ${availabilityError}` : null);
    return {
      id: row.id, driverName: row.name, status: row.currentStatus, activityStatus: row.currentStatus, vehicle: null,
      activeTripId: null, lastStatusChange: row.statusSinceIso || row.lastRestStartIso || row.lastRestStart || null, breakTime: row.breakDisplay,
      driving: row.drivingDisplay, duty: row.dutyDisplay, workday: row.workdayDisplay, cycle: row.cycleRemainingDisplay,
      updatedAt: new Date().toISOString(), clientId: null, currentStatus: row.currentStatus,
      cycleRemainingDisplay: row.cycleRemainingDisplay, cycleTomorrowDisplay: row.cycleTomorrowDisplay,
      drivingDisplay: row.drivingDisplay, dutyDisplay: row.dutyDisplay, workdayDisplay: row.workdayDisplay,
      breakDisplay: row.breakDisplay, cycleResetDisplay: row.cycleResetDisplay, remainingDisplay: row.remainingDisplay,
      statusSinceDisplay: row.statusSinceDisplay, statusSinceIso: row.statusSinceIso, note: row.note, readiness: row.readiness
    };
  }));

  rows.sort((a, b) => String(a.driverName || "").localeCompare(String(b.driverName || "")));
  const summary = {
    ready: rows.filter((row) => row.readiness === "READY").length,
    notReady: rows.filter((row) => row.readiness === "NOT READY").length,
    noLogs: rows.filter((row) => row.readiness === "NO LOGS").length
  };

  return { drivers: rows, summary, totalDrivers: rows.length, generatedAt: new Date().toISOString() };
}
