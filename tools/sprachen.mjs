// Übersetzungen der Spieldaten (Namen, Beschreibungen) für den Sprachumschalter → data/lang/.
// Format: keys.json = Liste englischer Texte; <code>.json = gleich lange Liste mit der Übersetzung (leer = wie Englisch).
// Die App übersetzt damit angezeigte Texte; intern bleibt alles Englisch (Abgleich von Namen funktioniert weiter).
import fs from 'node:fs';

const SPRACHEN = ['de', 'fr', 'es', 'it', 'pt-br', 'pl', 'ru', 'ja', 'ko', 'zh-chs'];
const config = fs.readFileSync(new URL('../js/config.js', import.meta.url), 'utf8');
const apiKey = process.env.BUNGIE_API_KEY || (config.match(/apiKey:\s*'([^']*)'/) || [])[1];
if (!apiKey) process.exit(0);
const BASIS = 'https://www.bungie.net';
const holen = async (pfad) => { const r = await fetch(BASIS + pfad, { headers: { 'X-API-Key': apiKey } }); if (!r.ok) throw new Error(`${pfad}: ${r.status}`); return r.json(); };
const manifest = (await holen('/Platform/Destiny2/Manifest/')).Response;
const alt = fs.existsSync('data/lang/keys.json') ? JSON.parse(fs.readFileSync('data/lang/keys.json', 'utf8')) : null;
if (alt?.version === manifest.version && alt?.schema === 1) { console.log('Translations unchanged.'); process.exit(0); }
const defs = JSON.parse(fs.readFileSync('data/defs.json', 'utf8'));

// Welche Objekte die App zeigt, je Bungie-Tabelle: Hash-Liste + welche Felder.
const TABELLEN = [
  ['DestinyInventoryItemLiteDefinition', Object.keys(defs.items), (x) => [x.displayProperties?.name, x.displayProperties?.description, x.itemTypeDisplayName]],
  ['DestinyEquipableItemSetDefinition', Object.keys(defs.sets || {}), (x) => [x.displayProperties?.name, ...(x.setPerks || []).map(() => '')]],
  ['DestinyStatDefinition', Object.keys(defs.stats || {}), (x) => [x.displayProperties?.name, x.displayProperties?.description]],
  ['DestinyDamageTypeDefinition', Object.keys(defs.schaden || {}), (x) => [x.displayProperties?.name]],
  ['DestinyActivityModifierDefinition', Object.keys(defs.mod || {}), (x) => [x.displayProperties?.name, x.displayProperties?.description]],
  ['DestinyRecordDefinition', Object.keys(defs.rec || {}), (x) => [x.displayProperties?.name, x.displayProperties?.description, x.titleInfo?.titlesByGender?.Male]],
  ['DestinyPresentationNodeDefinition', Object.keys(defs.seal || {}), (x) => [x.displayProperties?.name, x.displayProperties?.description]],
  ['DestinyLoadoutNameDefinition', Object.keys(defs.lo?.n || {}), (x) => [x.name]],
];
// Set-Boni hängen an Sandbox-Perks.
const setPerkHashes = new Set();
const lade = async (lang, tabelle) => holen(manifest.jsonWorldComponentContentPaths[lang][tabelle]);

const paare = new Map(); // englisch → { lang: übersetzt }
const merke = (en, lang, txt) => { if (!en || !txt || en === txt) return; const e = paare.get(en) || {}; if (!e[lang]) e[lang] = txt; paare.set(en, e); };
for (const [tabelle, hashes, felder] of TABELLEN) {
  const en = await lade('en', tabelle);
  if (tabelle === 'DestinyEquipableItemSetDefinition') for (const h of hashes) for (const p of en[h]?.setPerks || []) setPerkHashes.add(p.sandboxPerkHash);
  for (const lang of SPRACHEN) {
    let lo;
    try { lo = await lade(lang, tabelle); } catch (e) { console.log(`skip ${lang} ${tabelle}: ${e.message}`); continue; }
    for (const h of hashes) { const a = felder(en[h] || {}), b = felder(lo[h] || {}); a.forEach((t, i) => merke(t, lang, b[i])); }
  }
  console.log(`done ${tabelle}`);
}
const enPerks = await lade('en', 'DestinySandboxPerkDefinition');
for (const lang of SPRACHEN) {
  const lo = await lade(lang, 'DestinySandboxPerkDefinition').catch(() => ({}));
  for (const h of setPerkHashes) { merke(enPerks[h]?.displayProperties?.name, lang, lo[h]?.displayProperties?.name); merke(enPerks[h]?.displayProperties?.description, lang, lo[h]?.displayProperties?.description); }
}
fs.mkdirSync('data/lang', { recursive: true });
const keys = [...paare.keys()];
fs.writeFileSync('data/lang/keys.json', JSON.stringify({ schema: 1, version: manifest.version, keys }));
for (const lang of SPRACHEN) fs.writeFileSync(`data/lang/${lang}.json`, JSON.stringify(keys.map((k) => paare.get(k)[lang] || '')));
console.log(`Wrote ${keys.length} translated texts for ${SPRACHEN.length} languages.`);
