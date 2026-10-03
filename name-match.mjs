// name-match.mjs — match a driver across sources that spell names differently.
//
// Geotab gives "RUSSELL BELK DILLARD" (first + middle + last from the user
// record), Amazon Relay gives "Dillard, Russell" or "Russell Dillard", and the
// extension reports whatever the Relay board shows. Comparing raw strings misses
// most real pairs, so normalize to tokens and match on first + last.
//
// Deliberately stricter than a substring test: "Jon" must not match "Jonathan",
// and placeholder names never match anything.

const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);

// Names that are placeholders, not people. These must never match.
const PLACEHOLDERS = new Set([
  "unknown driver", "unknown", "unassigned driver", "unassigned",
  "driver", "n a", "na", "tbd", "none",
]);

// "Dillard, Russell Belk" -> ["russell", "belk", "dillard"]
export function nameTokens(raw) {
  let text = String(raw || "").toLowerCase().replace(/\(.*?\)/g, " ");

  // Relay often writes "Last, First Middle" — flip it before tokenizing.
  const parts = text.split(",");
  if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
    text = `${parts[1]} ${parts[0]}`;
  }

  return text
    // Apostrophes and periods are dropped, not split on, so "O'Brien" and
    // "OBrien" tokenize the same way and "St." matches "St".
    .replace(/['‘’.]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((word) => word && !SUFFIXES.has(word));
}

export function isPlaceholderName(raw) {
  const flat = nameTokens(raw).join(" ");
  return !flat || PLACEHOLDERS.has(flat);
}

// Do these two spellings refer to the same driver?
export function namesMatch(a, b) {
  if (isPlaceholderName(a) || isPlaceholderName(b)) return false;

  const A = nameTokens(a);
  const B = nameTokens(b);
  if (!A.length || !B.length) return false;

  if (A.join(" ") === B.join(" ")) return true;              // identical

  const aFirst = A[0], aLast = A[A.length - 1];
  const bFirst = B[0], bLast = B[B.length - 1];

  // A single token can only match a single token, which the identity check above
  // already covered — otherwise "Dillard" would match every Dillard.
  if (A.length < 2 || B.length < 2) return false;

  if (aFirst === bFirst && aLast === bLast) return true;      // same first + last

  // Same last name, and one first name is a prefix of the other ("Rob"/"Robert").
  if (aLast === bLast && (aFirst.startsWith(bFirst) || bFirst.startsWith(aFirst))) return true;

  // One spelling's tokens are all present in the other (handles middle names).
  const setA = new Set(A);
  const setB = new Set(B);
  if (B.every((w) => setA.has(w))) return true;
  if (A.every((w) => setB.has(w))) return true;

  return false;
}

// Find the one item in `items` whose name matches `raw`. Returns null when there
// is no match, or when two different items match (ambiguous — better to stay
// quiet than to alert about the wrong driver).
export function findByName(raw, items, getName = (item) => item.driverName) {
  if (isPlaceholderName(raw) || !Array.isArray(items)) return null;
  const hits = items.filter((item) => namesMatch(raw, getName(item)));
  return hits.length === 1 ? hits[0] : null;
}
