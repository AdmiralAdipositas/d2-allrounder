// Mögliche Perks je Waffe (alle Spalten, die zufällig rollen können) → data/perks.json. Läuft täglich in der GitHub Action.
import fs from 'node:fs';

const config = fs.readFileSync(new URL('../js/config.js', import.meta.url), 'utf8');
const apiKey = process.env.BUNGIE_API_KEY || (config.match(/apiKey:\s*'([^']*)'/) || [])[1];
if (!apiKey) { console.log('No API key.'); process.exit(0); }
const BASIS = 'https://www.bungie.net';
const holen = async (pfad) => { const r = await fetch(BASIS + pfad, { headers: { 'X-API-Key': apiKey } }); if (!r.ok) throw new Error(`${pfad}: ${r.status}`); return r.json(); };
const manifest = (await holen('/Platform/Destiny2/Manifest/')).Response;
const alt = fs.existsSync('data/perks.json') ? JSON.parse(fs.readFileSync('data/perks.json', 'utf8')) : null;
if (alt?.version === manifest.version && alt?.schema === 2) { console.log('Perk data unchanged.'); process.exit(0); }
const pfade = manifest.jsonWorldComponentContentPaths.en;
const [items, plugSets] = await Promise.all([holen(pfade.DestinyInventoryItemDefinition), holen(pfade.DestinyPlugSetDefinition)]);

// Nur echte Perk-Spalten: Läufe, Magazine, Traits, Origin usw. Keine Shader, Mods, Masterworks, Tracker.
const SPALTE = /^(barrels|scopes|magazines|magazines_gl|tubes|arrows|batteries|blades|guards|hafts|bowstrings|stocks|grips|frames|origins)$/;
const aus = { schema: 2, version: manifest.version, erstellt: new Date().toISOString(), w: {} };
for (const [h, it] of Object.entries(items)) {
  if (it.itemType !== 3 || !it.displayProperties?.name || (it.inventory?.tierType || 0) < 5) continue;
  const spalten = [];
  for (const se of it.sockets?.socketEntries || []) {
    const set = plugSets[se.randomizedPlugSetHash] || plugSets[se.reusablePlugSetHash];
    let kandidaten = set ? set.reusablePlugItems.filter((p) => p.currentlyCanRoll !== false).map((p) => p.plugItemHash) : [];
    // Feste Spalten (z. B. ein festes Magazin) trotzdem zeigen.
    if (!kandidaten.length && se.singleInitialItemHash) kandidaten = [se.singleInitialItemHash];
    const namen = new Set();
    const liste = [];
    for (const p of kandidaten) {
      const d = items[p];
      const pc = d?.plug?.plugCategoryIdentifier || '';
      const n = d?.displayProperties?.name;
      if (!n || !SPALTE.test(pc) || namen.has(n)) continue;
      // Enhanced-Versionen haben denselben Namen; die normale Version reicht.
      namen.add(n); liste.push(Number(p));
    }
    if (liste.length) spalten.push(liste);
  }
  if (spalten.length && spalten.some((s) => s.length > 1)) aus.w[h] = spalten;
}
fs.writeFileSync('data/perks.json', JSON.stringify(aus));
console.log(`Wrote data/perks.json with ${Object.keys(aus.w).length} weapons.`);
