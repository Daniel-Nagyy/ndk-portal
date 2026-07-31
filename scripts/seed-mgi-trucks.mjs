// Seed the MGI fleet into the Truck Tracker. Idempotent: each truck uses a stable
// id (mgi-truck-<assetId>), so re-running updates rather than duplicating.
// Coordinates are intentionally omitted; issue and WO are left empty.
//   node scripts/seed-mgi-trucks.mjs            (auto-detects the MGI account)
//   node scripts/seed-mgi-trucks.mjs <accountId>
import { listAccounts, upsertDownTruck } from "../db.mjs";

const arg = process.argv[2];
const acct = arg
  ? listAccounts().find((a) => a.id === arg)
  : (listAccounts().find((a) => /mgi/i.test(a.name)) || listAccounts()[0]);
if (!acct) {
  console.error(`Account not found. Existing: ${listAccounts().map((a) => a.id).join(", ") || "(none)"}`);
  process.exit(1);
}
console.log(`Seeding trucks into account: ${acct.name} (${acct.id})`);

// assetId | ownership | make | body | fuel | owner | license | vin | status   (type is always "Tractor")
const DATA = `
521243|Fleet|Kenworth|Day cab|CNG|AZNG|3170634|1NKYD39X4NJ130484|Unavailable
320152|Fleet|Volvo|Day cab|CNG|AZNG|3026037|4V4NC9UG8MN282264|Unavailable
521086|Fleet|Kenworth|Day cab|CNG|AZNG|3118908|1NKYD39X3NJ494346|Unavailable
122323|Fleet|Freightliner|Day cab|CNG|AZNG|3256640|1FUJHTFW6PLNY0057|Unavailable
521247|Fleet|Kenworth|Day cab|CNG|AZNG|3170638|1NKYD39X1NJ130488|Unavailable
521112|Fleet|Kenworth|Day cab|CNG|AZNG|3118934|1NKYD39X4NJ494372|Unavailable
521132|Fleet|Kenworth|Day cab|CNG|AZNG|3118954|1NKYD39XXNJ494392|Unavailable
9010385|Fleet|Peterbilt|Sleeper|DIESEL|Paclease|3256570|1XPBDP9X1PD854809|Unavailable
321939|Fleet|Volvo|Day cab|CNG|AZNG|3197858|4V4NC9UG3NN318363|Unavailable
122106|Fleet|Freightliner|Day cab|CNG|AZNG|3189549|1FUJHTFW7NLNP6760|Unavailable
521245|Fleet|Kenworth|Day cab|CNG|AZNG|3170636|1NKYD39X8NJ130486|Unavailable
521107|Permaloaner|Kenworth|Day cab|CNG|AZNG|3118929|1NKYD39X0NJ494367|Active
521248|Permaloaner|Kenworth|Day cab|CNG|AZNG|3170639|1NKYD39X3NJ130489|Active
521044|Permaloaner|Kenworth|Day cab|CNG|AZNG|3042998|1NKYD39XXNJ480010|Active
122005|Fleet|Freightliner|Day cab|CNG|AZNG|3184606|1FUJHTFW7NLNP6659|Active
122289|Fleet|Freightliner|Day cab|CNG|AZNG|3240690|1FUJHTFW0PLNP6943|Active
122461|Fleet|Freightliner|Day cab|CNG|AZNG|3256998|1FUJHTFW1PLNW4266|Active
907684|Fleet|International|Sleeper|DIESEL|Merchants|3522538|3HSDZAPR7RN599802|Active
322184|Permaloaner|Volvo|Day cab|CNG|AZNG|3240472|4V4NC9UG7NN318608|Active
122459|Fleet|Freightliner|Day cab|CNG|AZNG|3256996|1FUJHTFW8PLNW4264|Active
521133|Fleet|Kenworth|Day cab|CNG|AZNG|3118955|1NKYD39X1NJ494393|Active
122101|Permaloaner|Freightliner|Day cab|CNG|AZNG|3189544|1FUJHTFW3NLNP6755|Active
521246|Fleet|Kenworth|Day cab|CNG|AZNG|3170637|1NKYD39XXNJ130487|Active
122425|Fleet|Freightliner|Day cab|CNG|AZNG|3256962|1FUJHTFW2PLNW4230|Active
424011|Fleet|International|Sleeper|DIESEL|AZNG|3599837|3HSDZAPR6SN335931|Active
122107|Fleet|Freightliner|Day cab|CNG|AZNG|3189550|1FUJHTFW9NLNP6761|Active
320142|Fleet|Volvo|Day cab|CNG|AZNG|3026027|4V4NC9UG5MN282254|Active
122102|Fleet|Freightliner|Day cab|CNG|AZNG|3189545|1FUJHTFW5NLNP6756|Active
521249|Fleet|Kenworth|Day cab|CNG|AZNG|3876787|1NKYD39XXNJ130490|Active
320150|Fleet|Volvo|Day cab|CNG|AZNG|3026035|4V4NC9UG4MN282262|Active
521244|Fleet|Kenworth|Day cab|CNG|AZNG|3170635|1NKYD39X6NJ130485|Active
521117|Fleet|Kenworth|Day cab|CNG|AZNG|3118939|1NKYD39X3NJ494377|Active
122103|Permaloaner|Freightliner|Day cab|CNG|AZNG|3189546|1FUJHTFW7NLNP6757|Active
521105|Permaloaner|Kenworth|Day cab|CNG|AZNG|3118927|1NKYD39X7NJ494365|Active
122105|Fleet|Freightliner|Day cab|CNG|AZNG|3189548|1FUJHTFW0NLNP6759|Active
322141|Fleet|Volvo|Day cab|CNG|AZNG|3676444|4V4NC9UG4NN318565|Active
521079|Fleet|Kenworth|Day cab|CNG|AZNG|3119065|1NKYD39X6NJ494339|Active
521096|Fleet|Kenworth|Day cab|CNG|AZNG|3118918|1NKYD39X6NJ494356|Active
122424|Fleet|Freightliner|Day cab|CNG|AZNG|3256961|1FUJHTFW6PLNW4229|Active
`.trim();

let n = 0;
for (const line of DATA.split("\n")) {
  const [assetId, ownership, make, body, fuel, owner, license, vin, status] = line.split("|");
  upsertDownTruck({
    id: `mgi-truck-${assetId}`,
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
