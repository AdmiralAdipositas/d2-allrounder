// Baut aus Bungies Spieldaten eine kompakte Datei (data/defs.json) für die App.
// Läuft täglich als GitHub Action. Der API-Schlüssel kommt aus js/config.js (öffentlich, wie bei jeder Browser-App).
import fs from 'node:fs';

const config = fs.readFileSync(new URL('../js/config.js', import.meta.url), 'utf8');
const apiKey = process.env.BUNGIE_API_KEY || (config.match(/apiKey:\s*'([^']*)'/) || [])[1];
if (!apiKey) { console.log('No API key yet. Fill in js/config.js.'); process.exit(0); }
const BASIS = 'https://www.bungie.net';
const holen = async (pfad) => { const r = await fetch(BASIS + pfad, { headers: { 'X-API-Key': apiKey } }); if (!r.ok) throw new Error(`${pfad}: ${r.status}`); return r.json(); };

const manifest = (await holen('/Platform/Destiny2/Manifest/')).Response;
const pfade = manifest.jsonWorldComponentContentPaths.en;
const alt = fs.existsSync('data/defs.json') ? JSON.parse(fs.readFileSync('data/defs.json', 'utf8')) : null;
if (alt?.version === manifest.version && alt?.schema === 1) { console.log('Game data unchanged.'); process.exit(0); }

const [items, sandbox, sammlung, stats, sets, breaker, schaden] = await Promise.all([
  'DestinyInventoryItemDefinition', 'DestinySandboxPerkDefinition', 'DestinyCollectibleDefinition', 'DestinyStatDefinition',
  'DestinyEquipableItemSetDefinition', 'DestinyBreakerTypeDefinition', 'DestinyDamageTypeDefinition',
].map((n) => (pfade[n] ? holen(pfade[n]) : {})));

const text = (item) => item.displayProperties?.description || (item.perks || []).map((p) => sandbox[p.perkHash]?.displayProperties?.description).find(Boolean) || '';
const aus = { schema: 1, version: manifest.version, erstellt: new Date().toISOString(), items: {}, stats: {}, sets: {}, breaker: {}, schaden: {} };
for (const [hash, it] of Object.entries(items)) {
  const n = it.displayProperties?.name;
  // Nur, was die App braucht: Waffen, Rüstung, Subclasses, Plugs, Artefakte.
  if (!n || ![2, 3, 16, 19].includes(it.itemType) && it.inventory?.bucketTypeHash !== 1506418338) continue;
  const e = { n, i: it.displayProperties.icon || '', t: it.itemType, q: it.inventory?.tierType || 0, c: it.classType ?? 3, b: it.inventory?.bucketTypeHash || 0, k: it.itemTypeDisplayName || '' };
  if (it.itemType === 3) { e.a = it.equippingBlock?.ammoType || 0; e.d0 = it.defaultDamageType || 0; e.qu = sammlung[it.collectibleHash]?.sourceString || ''; e.br = it.breakerType || 0; }
  if (it.itemType === 2) e.e = it.equippingBlock?.equipableItemSetHash || 0;
  if (it.itemType === 19) {
    e.pc = it.plug?.plugCategoryIdentifier || '';
    e.d = text(it);
    const st = (it.investmentStats || []).filter((v) => v.value).map((v) => [v.statTypeHash, v.value]);
    if (st.length) e.s = st;
  }
  if (it.iconWatermark) e.w = it.iconWatermark;
  aus.items[hash] = e;
}
for (const [h, s] of Object.entries(stats)) if (s.displayProperties?.name) aus.stats[h] = { n: s.displayProperties.name, i: s.displayProperties.icon || '' };
for (const [h, s] of Object.entries(sets)) aus.sets[h] = { n: s.displayProperties?.name || '', p: (s.setPerks || []).map((p) => ({ c: p.requiredSetCount, n: sandbox[p.sandboxPerkHash]?.displayProperties?.name || '', d: sandbox[p.sandboxPerkHash]?.displayProperties?.description || '', i: sandbox[p.sandboxPerkHash]?.displayProperties?.icon || '' })) };
for (const b of Object.values(breaker)) aus.breaker[b.enumValue] = { n: b.displayProperties?.name || '', i: b.displayProperties?.icon || '' };
for (const d of Object.values(schaden)) aus.schaden[d.enumValue] = { n: d.displayProperties?.name || '', i: d.displayProperties?.icon || '', f: d.color ? `rgb(${d.color.red},${d.color.green},${d.color.blue})` : '' };
fs.writeFileSync('data/defs.json', JSON.stringify(aus));
console.log(`Wrote data/defs.json with ${Object.keys(aus.items).length} items.`);
