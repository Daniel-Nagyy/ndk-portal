// alert-kinds.mjs — what an alert IS, and how much it matters.
//
// The portal's own engines (hos-engine, tour-watch) state their kind and
// severity when they raise an alert. The browser extension cannot: it posts a
// free-text title and body to /api/ingest/alert, and that is where bobtails,
// arrivals, departures and the "he will not have his reset" warnings come
// from. So those are classified from their wording here.
//
// Classifying by text is a fallback, not the plan. An extension that sends
// `kind` explicitly is believed and never pattern-matched, so the matching
// below only has to hold the line until each sender is updated.

export const ALERT_KINDS = {
  "hos-risk": { label: "HOS clock", group: "hos" },
  // Their own group, not "hos". Both are about a tour that has not started
  // yet, so they belong at the bottom - but grouping them with the live clock
  // alerts dragged them straight back to the top, because a group is drawn
  // where its most urgent member falls.
  "hos-coverage": { label: "HOS won't cover the block", group: "upcoming" },
  "hos-reset": { label: "HOS won't reset", group: "upcoming" },
  "hos-status": { label: "Duty status change", group: "hos" },
  "tour-offduty": { label: "Off duty at a stop", group: "tour" },
  "tour-stopped": { label: "Stopped outside a site", group: "tour" },
  bobtail: { label: "Bobtail to clear", group: "yard" },
  arrival: { label: "Arrival", group: "tour" },
  departure: { label: "Departure", group: "tour" },
  late: { label: "Late", group: "tour" },
  netradyne: { label: "Netradyne", group: "safety" },
  // Everything else Netradyne reports: harsh braking, speeding, following
  // distance and so on. Still sent to the account's main Telegram chat, but
  // not put on the board -- the board carries what the focus group carries.
  "netradyne-routine": { label: "Netradyne (routine)", group: "safety" },
  system: { label: "System", group: "system" },
  other: { label: "Alert", group: "other" },
};

export const KIND_GROUPS = ["hos", "tour", "yard", "safety", "upcoming", "system", "other"];

// Recorded, but not shown and never popped up. A duty-status change fires for
// every driver every time they touch the switch: it is the highest-volume
// alert in the system and almost never something anyone acts on, so it buries
// the alerts that are. Still written to the table, so the history is intact
// and a filter can bring it back.
export const MUTED_KINDS = ["hos-status", "netradyne-routine"];

// What to read first. A clock about to run out needs a decision in the next
// few minutes; a driver who will not have finished resetting by tomorrow's
// tour is worth knowing and worth knowing LAST, because nothing is on fire.
// Both are "HOS", which is exactly why kind, not group, decides the order.
const KIND_PRIORITY = {
  "hos-risk": 0,        // 20/30/60 minutes left on a live clock
  "tour-offduty": 1,
  "tour-stopped": 2,
  bobtail: 3,
  netradyne: 4,
  late: 5,
  system: 6,
  arrival: 7,
  departure: 7,
  "hos-coverage": 8,    // the block ahead is not covered
  "hos-reset": 9,       // the reset will not be done in time for an upcoming tour
  "netradyne-routine": 10,
  "hos-status": 11,
  other: 12,
};

export function kindPriority(kind) {
  return KIND_PRIORITY[kind] == null ? KIND_PRIORITY.other : KIND_PRIORITY[kind];
}

// Severity first, then how urgent the kind is, then newest. Sorting by
// severity alone would float an info-level arrival above a warning.
const SEVERITY_ORDER = { critical: 0, urgent: 1, warning: 2, info: 3 };

export function compareAlerts(a, b) {
  const sev = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
  if (sev) return sev;
  const kind = kindPriority(a.kind) - kindPriority(b.kind);
  if (kind) return kind;
  return (b.id || 0) - (a.id || 0);
}

export function kindLabel(kind) {
  return (ALERT_KINDS[kind] || ALERT_KINDS.other).label;
}

export function kindGroup(kind) {
  return (ALERT_KINDS[kind] || ALERT_KINDS.other).group;
}

// Order matters: the first match wins, so the specific patterns come before
// the general ones. "Bobtail not cleared" must not be read as a mere arrival
// because the body happens to mention arriving at the yard.
const PATTERNS = [
  [/bobtail/i, "bobtail", "critical"],
  [/\breset\b.*\b(not|won't|wont|before|incomplete)\b|will not have .*reset|no 10-hour reset|10-hour reset/i, "hos-reset", "critical"],
  [/off duty at a stop/i, "tour-offduty", "critical"],
  [/stopped outside/i, "tour-stopped", "critical"],
  [/hos (critical|warning|risk)|hos \d+ min/i, "hos-risk", "critical"],
  [/\bdrows|distract|roadside parking|harsh|speeding|collision/i, "netradyne", "urgent"],
  [/\blate\b|delay/i, "late", "warning"],
  [/departed|departure/i, "departure", "info"],
  [/arrived|arrival|check-?in/i, "arrival", "info"],
  [/cannot read|unavailable|failed|error|not configured/i, "system", "warning"],
];

// `critical` is what the senders already pass (it drives push urgency), so it
// is honoured as a floor: something flagged critical never files as info just
// because its wording did not match a pattern.
export function classifyAlert({ title = "", body = "", kind, severity, critical } = {}) {
  if (kind && ALERT_KINDS[kind]) {
    return { kind, severity: normalizeSeverity(severity) || (critical ? "critical" : "info") };
  }

  const text = `${title}\n${body}`;
  for (const [pattern, matchedKind, matchedSeverity] of PATTERNS) {
    if (pattern.test(text)) {
      return {
        kind: matchedKind,
        severity: normalizeSeverity(severity) || matchedSeverity,
      };
    }
  }
  return { kind: "other", severity: normalizeSeverity(severity) || (critical ? "critical" : "info") };
}

function normalizeSeverity(value) {
  const v = String(value || "").toLowerCase();
  return ["critical", "urgent", "warning", "info"].includes(v) ? v : null;
}
