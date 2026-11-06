// readiness-cache.mjs — one Geotab readiness fetch per account, shared.
//
// computeReadiness() is the expensive call in this app: roughly one Geotab
// request per driver. The alert engine already polls it every 60–150s, and the
// Daily Recap now wants the same numbers whenever a dispatcher opens the page.
// Without this, opening the recap would start a second poll of a login that is
// already rate-limited, and two dispatchers refreshing could trip Geotab's
// throttling — which is how a healthy login starts returning errors.
//
// So: one in-flight fetch per account, and a short TTL.
import { getAccountCredentials } from "./db.mjs";
import { computeReadiness } from "./geotab.mjs";

const TTL_MS = Number(process.env.READINESS_CACHE_TTL_MS || 60_000);
// How long a cached result may still be served after a fetch fails. A blocked
// Geotab login would otherwise blank the recap badges outright; stale numbers
// clearly marked stale are more use to a dispatcher than nothing.
const STALE_MS = Number(process.env.READINESS_STALE_MS || 15 * 60_000);

const cache = new Map();   // accountId -> { data, fetchedAt }
const inFlight = new Map(); // accountId -> Promise

export async function readinessForAccount(accountId, { force = false } = {}) {
  const hit = cache.get(accountId);
  const age = hit ? Date.now() - hit.fetchedAt : Infinity;
  if (!force && hit && age < TTL_MS) {
    return { ...hit.data, fetchedAt: new Date(hit.fetchedAt).toISOString(), stale: false };
  }

  // Collapse concurrent callers onto one fetch.
  if (inFlight.has(accountId)) return inFlight.get(accountId);

  const promise = (async () => {
    const creds = getAccountCredentials(accountId);
    if (!creds || !creds.geotab || !creds.geotab.database || !creds.geotab.username) {
      throw new Error(`No Geotab credentials for ${accountId}`);
    }
    try {
      const data = await computeReadiness(creds.geotab);
      cache.set(accountId, { data, fetchedAt: Date.now() });
      return { ...data, fetchedAt: new Date().toISOString(), stale: false };
    } catch (error) {
      if (hit && age < STALE_MS) {
        return { ...hit.data, fetchedAt: new Date(hit.fetchedAt).toISOString(), stale: true, error: String(error.message || error) };
      }
      throw error;
    } finally {
      inFlight.delete(accountId);
    }
  })();

  inFlight.set(accountId, promise);
  return promise;
}

// The engine has just fetched; let the recap reuse it instead of refetching.
export function primeReadiness(accountId, data) {
  if (data) cache.set(accountId, { data, fetchedAt: Date.now() });
}
