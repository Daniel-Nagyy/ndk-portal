// netradyne/topics.js — which Netradyne alerts also go to an account's focus group.
//
// The account's main Telegram chat receives every alert (plus HOS). The optional
// focus group is a second, quieter chat that carries only what needs an immediate
// look: roadside parking, driver distraction and driver drowsiness here, plus the
// 20-minutes-left HOS tier from hos-engine.mjs.
//
// Netradyne names these differently depending on where the string comes from —
// the raw alert type ("DRIVER-DROWSINESS"), the humanized type ("Driver
// Drowsiness") or the per-event description ("Drowsy", "Cell Phone Usage") — so
// match loosely across all three rather than against one exact label.
const FOCUS_PATTERNS = [
  /roadside/i,    // Roadside Parking
  /distract/i,    // Driver Distraction (cell phone, looking away, eating, …)
  /drows/i,       // Driver Drowsiness / Drowsy
];

export function isFocusAlert(alert) {
  const haystack = [alert?.eventTypeRaw, alert?.eventType, alert?.eventCategory]
    .filter(Boolean)
    .join(" ");
  return FOCUS_PATTERNS.some((re) => re.test(haystack));
}
