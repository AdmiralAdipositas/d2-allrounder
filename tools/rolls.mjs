// Baut aus der Community-Wunschliste (DIM "voltron") eine kompakte Datei data/rolls.json:
// pro Waffe die empfohlenen Perks für PvE und PvP und die God-Roll-Kombinationen.
import fs from 'node:fs';

const QUELLE = 'https://raw.githubusercontent.com/48klocs/dim-wish-list-sources/master/voltron.txt';
const text = process.argv[2] ? fs.readFileSync(process.argv[2], 'utf8') : await (await fetch(QUELLE)).text();
const items = {};
let notiz = '';
for (const zeile of text.split('\n')) {
  if (zeile.startsWith('//notes:')) { notiz = zeile; continue; }
  if (!zeile.startsWith('dimwishlist:')) continue;
  const m = zeile.match(/item=(\d+)&perks=([\d,]+)(.*)$/);
  if (!m) continue;
  const n = `${notiz} ${m[3]}`;
  const pve = /pve/i.test(n), pvp = /pvp/i.test(n);
  const god = /god/i.test(n);
  const perks = m[2].split(',').map(Number).filter(Boolean);
  const e = (items[m[1]] = items[m[1]] || { e: new Set(), v: new Set(), ge: [], gv: [] });
  for (const [an, perkSet, gods] of [[pve || !pvp, e.e, e.ge], [pvp, e.v, e.gv]]) {
    if (!an) continue;
    perks.forEach((p) => perkSet.add(p));
    if (god && gods.length < 6 && !gods.some((g) => g.join() === perks.join())) gods.push(perks);
  }
}
const aus = { quelle: QUELLE, erstellt: new Date().toISOString(), items: {} };
for (const [h, e] of Object.entries(items)) {
  const x = {};
  if (e.e.size) x.e = [...e.e];
  if (e.v.size) x.v = [...e.v];
  if (e.ge.length) x.ge = e.ge;
  if (e.gv.length) x.gv = e.gv;
  aus.items[h] = x;
}
fs.writeFileSync('data/rolls.json', JSON.stringify(aus));
console.log(`Wrote data/rolls.json with ${Object.keys(aus.items).length} weapons.`);
