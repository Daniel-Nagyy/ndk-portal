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
  "hos-coverage": { label: "HOS won't cover the block", group: "hos" },
  "hos-reset": { label: "HOS won't reset", group: "hos" },
  "hos-status": { label: "Duty status change", group: "hos" },
  "tour-offduty": { label: "Off duty at a stop", group: "tour" },
  "tour-stopped": { label: "Stopped outside a site", group: "tour" },
  bobtail: { label: "Bobtail to clear", group: "yard" },
  arrival: { label: "Arrival", group: "tour" },
  departure: { label: "Departure", group: "tour" },
  late: { label: "Late", group: "tour" },
  netradyne: { label: "Netradyne", group: "safety" },
  system: { label: "System", group: "system" },
  other: { label: "Alert", group: "other" },
};

export const KIND_GROUPS = ["hos", "tour", "yard", "safety", "system", "other"];

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
