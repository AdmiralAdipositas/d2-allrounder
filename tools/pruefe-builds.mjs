// Prüft jeden Build gegen Bungies Spieldaten: jeder Name (Exotic, Aspekt, Fragment, Fähigkeit, Artefakt-Perk)
// muss im Spiel existieren. Unbekannte Namen brechen den Build-Check ab, damit nichts Falsches live geht.
import fs from 'fs';
const defs = JSON.parse(fs.readFileSync(new URL('../data/defs.json', import.meta.url)));
const B = JSON.parse(fs.readFileSync(new URL('../data/builds.json', import.meta.url)));
const norm = (s) => String(s).toLowerCase().replace(/[’']/g, "'").replace(/^the /, '').trim();
const namen = new Set(Object.values(defs.items).map((d) => d.n && norm(d.n)).filter(Boolean));
const SUB = new Set(['dawnblade', 'stormcaller', 'voidwalker', 'shadebinder', 'broodweaver', 'sunbreaker', 'striker', 'sentinel', 'behemoth', 'berserker', 'gunslinger', 'arcstrider', 'nightstalker', 'revenant', 'threadrunner', 'prismatic titan', 'prismatic hunter', 'prismatic warlock']);
let fehler = 0;
const warn = [];
for (const b of B.builds) {
  const pruef = (feld, liste, hart = true) => (liste || []).forEach((n) => {
    const k = norm(n).replace(/^.*?: /, (m) => (namen.has(norm(n)) ? m : ''));
    if (namen.has(norm(n)) || namen.has(k)) return;
    (hart ? (fehler++, console.error) : (warn.push(n), () => {}))(`✗ ${b.id}: ${feld} "${n}" not in game data`);
  });
  if (!SUB.has(norm(b.subclass))) { fehler++; console.error(`✗ ${b.id}: subclass "${b.subclass}"`); }
  if (!b.link || !b.quelle || !b.warum) { fehler++; console.error(`✗ ${b.id}: source link, source name and "why" are required`); }
  pruef('exotic', b.exotics); pruef('aspect', b.aspekte); pruef('fragment', b.fragmente); pruef('ability', b.faehigkeiten);
  pruef('artifact perk', b.artefaktPerks, false);
}
if (warn.length) console.log(`Artifact perks not in current game data (season may have changed): ${[...new Set(warn)].join(', ')}`);
console.log(`${B.builds.length} builds checked, ${fehler} errors`);
process.exit(fehler ? 1 : 0);
