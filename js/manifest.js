// Einzelne Spieldaten bei Bungie nachschlagen (Aktivitäten, Ziele, Händler), mit Zwischenspeicher.
import { get } from './bungie.js';

const SPEICHER = 'd2a.manifest';
let cache = (() => { try { return JSON.parse(localStorage.getItem(SPEICHER) || '{}'); } catch { return {}; } })();
let laufend = 0;
const warte = [];
const frei = () => (laufend < 8 ? Promise.resolve() : new Promise((r) => warte.push(r)));
let speichernPlan = null;
const merke = () => {
  clearTimeout(speichernPlan);
  speichernPlan = setTimeout(() => { try { localStorage.setItem(SPEICHER, JSON.stringify(cache)); } catch { cache = {}; } }, 1500);
};

// Nur das Nötigste behalten, damit der Speicher klein bleibt.
const kurz = (d) => d && ({
  n: d.displayProperties?.name || d.progressDescription || '', d: d.displayProperties?.description || '', i: d.displayProperties?.icon || '',
  k: d.itemTypeDisplayName || '', t: d.activityTypeHash || 0, tq: d.inventory?.tierType || 0, pd: d.progressDescription || '',
});

export async function def(typ, hash) {
  const key = `${typ[7]}${typ.length}:${hash}`;
  if (key in cache) return cache[key];
  await frei();
  laufend++;
  try {
    cache[key] = kurz(await get(`/Destiny2/Manifest/${typ}/${hash}/`));
  } catch {
    cache[key] = null;
  } finally {
    laufend--;
    warte.shift()?.();
    merke();
  }
  return cache[key];
}
export const defs = (typ, hashes) => Promise.all(hashes.map((h) => def(typ, h)));
