// Seed the Triple J fleet into the Truck Tracker. Idempotent: each truck uses a stable
// id (triplej-truck-<assetId>), so re-running updates rather than duplicating.
// Coordinates are intentionally omitted; issue and WO are left empty.
//   node scripts/seed-triplej-trucks.mjs            (auto-detects the Triple J account)
//   node scripts/seed-triplej-trucks.mjs <accountId>
import { listAccounts, upsertDownTruck } from "../db.mjs";

const arg = process.argv[2];
const acct = arg
  ? listAccounts().find((a) => a.id === arg)
  : (listAccounts().find((a) => /triple\s*-?\s*j/i.test(a.name)) || listAccounts()[0]);
if (!acct) {
  console.error(`Account not found. Existing: ${listAccounts().map((a) => a.id).join(", ") || "(none)"}`);
  process.exit(1);
}
console.log(`Seeding trucks into account: ${acct.name} (${acct.id})`);

// assetId | ownership | make | body | fuel | owner | license | vin | status   (type is always "Tractor")
const DATA = `
521057|Fleet|Kenworth|Day cab|CNG|AZNG|3043011|1NKYD39X8NJ480023|Unavailable
124091|Fleet|Freightliner|Sleeper|DIESEL|AZNG|3599707|3AKJHPDV7SSVV8955|Unavailable
322460|Fleet|Volvo|Day cab|CNG|AZNG|3256735|4V4NC9UG1PN335567|Unavailable
39196|Fleet|Volvo|Day cab|DIESEL|AZNG|3599954|4V4WC9EG7LN258734|Unavailable
39514|Permaloaner|Volvo|Day cab|DIESEL|AZNG|3545591|4V4WC9EG0LN261796|Unavailable
39445|Fleet|Volvo|Day cab|DIESEL|AZNG|3600327|4V4WC9EG6LN260734|Unavailable
520118|Fleet|Kenworth|Day cab|CNG|AZNG|3042843|1NKYD39X3MJ459790|Active
521280|Fleet|Kenworth|Day cab|CNG|AZNG|3170671|1NKYD39X6NJ130521|Active
9010324|Fleet|Kenworth|Sleeper|DIESEL|Paclease|3241205|1XKYDP9X2NJ225784|Active
39275|Fleet|Volvo|Day cab|DIESEL|AZNG|3599918|4V4WC9EG7LN260564|Active
324080|Fleet|Volvo|Sleeper|DIESEL|AZNG|3599755|4V4NC9EH9SN680569|Active
39567|Permaloaner|Volvo|Day cab|DIESEL|AZNG|3545620|4V4WC9EG6LN261849|Active
122455|Fleet|Freightliner|Day cab|CNG|AZNG|3256992|1FUJHTFW0PLNW4260|Active
324067|Fleet|Volvo|Sleeper|DIESEL|AZNG|3599741|4V4NC9EH6SN680559|Active
321795|Fleet|Volvo|Day cab|CNG|AZNG|3184424|4V4NC9UG9NN317752|Active
39284|Permaloaner|Volvo|Day cab|DIESEL|AZNG|3600032|4V4WC9EG8LN260573|Active
9010402|Fleet|Kenworth|Sleeper|DIESEL|Paclease|3257162|1XKYDP9X2PJ258562|Active
520110|Fleet|Kenworth|Day cab|CNG|AZNG|3042835|1NKYD39X4MJ459782|Active
124090|Fleet|Freightliner|Sleeper|DIESEL|AZNG|3599706|3AKJHPDV5SSVV8954|Active
122358|Fleet|Freightliner|Day cab|CNG|AZNG|3256675|1FUJHTFW8PLNY0092|Active
39224|Fleet|Volvo|Day cab|DIESEL|AZNG|3545552|4V4WC9EG1LN258762|Active
521266|Fleet|Kenworth|Day cab|CNG|AZNG|3170657|1NKYD39X1NJ130507|Active
321882|Fleet|Volvo|Day cab|CNG|AZNG|3197805|4V4NC9UG2NN318306|Active
122104|Fleet|Freightliner|Day cab|CNG|AZNG|3189547|1FUJHTFW9NLNP6758|Active
124036|Permaloaner|Freightliner|Sleeper|DIESEL|AZNG|3545731|3AKJHPDV4SSVV8900|Active
320257|Fleet|Volvo|Day cab|CNG|AZNG|2999687|4V4NC9UG6MN282375|Active
39185|Fleet|Volvo|Day cab|DIESEL|AZNG|3599953|4V4WC9EG2LN258723|Active
59269|Fleet|Kenworth|Day cab|DIESEL|AZNG|2882968|1XKYDP9X2LJ408910|Active
122426|Fleet|Freightliner|Day cab|CNG|AZNG|3256963|1FUJHTFW4PLNW4231|Active
39391|Fleet|Volvo|Day cab|DIESEL|AZNG|3545524|4V4WC9EG9LN260680|Active
322019|Fleet|Volvo|Day cab|CNG|AZNG|3239138|4V4NC9UG1NN318443|Active
221025|Fleet|Freightliner|Sleeper|CNG|AZNG|3256381|1FUJHPFW1PLNY0023|Active
39530|Fleet|Volvo|Day cab|DIESEL|AZNG|2882849|4V4WC9EG5LN261812|Active
124044|Fleet|Freightliner|Sleeper|DIESEL|AZNG|3545754|3AKJHPDV9SSVV8908|Active
59165|Fleet|Kenworth|Day cab|DIESEL|AZNG|2882713|1XKYDP9X5LJ407542|Active
39438|Permaloaner|Volvo|Day cab|DIESEL|AZNG|3600329|4V4WC9EG9LN260727|Active
59168|Fleet|Kenworth|Day cab|DIESEL|AZNG|2882716|1XKYDP9X0LJ407545|Active
`.trim();

let n = 0;
for (const line of DATA.split("\n")) {
  const [assetId, ownership, make, body, fuel, owner, license, vin, status] = line.split("|");
  upsertDownTruck({
    id: `triplej-truck-${assetId}`,
    accountId: acct.id,
    truckNumber: assetId,
    vehicleType: "Tractor",
    ownership, make, body, fuel, owner, license, vin,
    status,
    issue: "", woNumber: "", downDate: "",
  });
  n++;
}
console.log(`Seeded ${n} trucks into ${acct.name}.`);
