// Baut aus dem Text einer Exotic-Rüstung ein komplettes Loadout: Subclass, Super, Fähigkeiten, Aspekte, Fragmente.
// Grundlage sind Bungies Spieldaten; gewählt wird, was am besten zum Exotic-Text passt.
import { defs } from './defs.js';

const KL = { 0: 'titan', 1: 'hunter', 2: 'warlock' };
const EL = { Solar: 'solar', Arc: 'arc', Void: 'void', Stasis: 'stasis', Strand: 'strand', Prismatic: 'prism' };
export const SUBCLASS = {
  titan: { solar: 'Sunbreaker', arc: 'Striker', void: 'Sentinel', stasis: 'Behemoth', strand: 'Berserker', prism: 'Prismatic Titan' },
  hunter: { solar: 'Gunslinger', arc: 'Arcstrider', void: 'Nightstalker', stasis: 'Revenant', strand: 'Threadrunner', prism: 'Prismatic Hunter' },
  warlock: { solar: 'Dawnblade', arc: 'Stormcaller', void: 'Voidwalker', stasis: 'Shadebinder', strand: 'Broodweaver', prism: 'Prismatic Warlock' },
};
const STOP = new Set('your with that this when while from have will after into their they them grants increases more also each have been being nearby allies enemies damage final blows ability abilities energy using become becomes duration'.split(' '));
const worte = (t) => new Set((t || '').toLowerCase().match(/[a-z]{4,}/g)?.filter((w) => !STOP.has(w)) || []);

let katalog = null;
function plugs() {
  if (katalog) return katalog;
  katalog = new Map();
  for (const [h, d] of Object.entries(defs.items)) {
    if (d.t !== 19 || !d.pc || !d.n || !d.d || /deprecated|no longer/i.test(d.d)) continue;
    const m = d.pc.match(/^(titan|hunter|warlock|shared)\.(solar|arc|void|stasis|strand|prism)\.(aspects|fragments|supers|grenades|melee|class_abilities)$/);
    if (!m) continue;
    const key = `${m[1]}.${m[2]}.${m[3]}`;
    const liste = katalog.get(key) || [];
    if (!liste.some((x) => x.n === d.n)) liste.push({ hash: Number(h), n: d.n, d: d.d });
    katalog.set(key, liste);
  }
  return katalog;
}

function wahl(liste, text, anzahl) {
  const w = worte(text);
  const roh = (text || '').toLowerCase();
  return [...(liste || [])].map((p) => {
    let s = 0;
    if (roh.includes(p.n.toLowerCase())) s += 20;
    for (const x of worte(`${p.n} ${p.d}`)) if (w.has(x)) s += 1;
    if (/[−-]\d+ (Melee|Grenade|Class|Super|Weapons|Health)/.test(p.d)) s -= 1;
    return { ...p, s };
  }).sort((a, b) => b.s - a.s || a.n.localeCompare(b.n)).slice(0, anzahl);
}

export function elementeAus(text) {
  if (/Light and Darkness|Prismatic|Transcendence/i.test(text || '')) return ['Prismatic'];
  return Object.keys(EL).filter((e) => e !== 'Prismatic' && new RegExp(`\\b${e}\\b`, 'i').test(text || ''));
}

const WAFFEN = ['Glaive', 'Sword', 'Hand Cannon', 'Shotgun', 'Sniper Rifle', 'Fusion Rifle', 'Linear Fusion Rifle', 'Grenade Launcher', 'Rocket Launcher', 'Auto Rifle', 'Pulse Rifle', 'Scout Rifle', 'Submachine Gun', 'Sidearm', 'Bow', 'Trace Rifle', 'Machine Gun'];
const STAT_WORT = [['Grenade', /grenade/i], ['Melee', /melee|punch|charged/i], ['Super', /super/i], ['Class', /class ability|dodge|rift|barricade|dive/i], ['Weapons', /weapon|reload|ammo|precision/i], ['Health', /heal|restor|damage resistance|overshield/i]];

export function baueIdee(hash, d) {
  const kl = KL[d.c];
  const text = `${d.xp || ''} ${d.xd || ''}`;
  const els = elementeAus(text);
  const el = EL[els[0] || 'Prismatic'];
  const k = plugs();
  const g = (key, n) => wahl(k.get(key), text, n);
  const aspekte = g(`${kl}.${el}.aspects`, 2);
  const fragmente = g(`shared.${el}.fragments`, el === 'prism' ? 5 : 4);
  const sup = g(`${kl}.${el}.supers`, 1);
  const gran = g(el === 'prism' ? `${kl}.prism.grenades` : `shared.${el}.grenades`, 1);
  const nah = g(`${kl}.${el}.melee`, 1);
  const kla = g(`${kl}.${el}.class_abilities`, 1);
  const stats = STAT_WORT.filter(([, re]) => re.test(d.xd || '')).map(([n]) => n).slice(0, 3);
  const waffe = WAFFEN.find((w) => new RegExp(w, 'i').test(d.xd || ''));
  const subclass = SUBCLASS[kl][el];
  const begruendung = (p) => (p ? `${p.n}: ${p.d.split('. ')[0].replace(/\.$/, '')}.` : '');
  return {
    id: `idee-${hash}`, idee: true, klasse: d.c, name: `${d.n} ${subclass.replace(/^Prismatic /, 'Prismatic')}`.replace(`${d.n} Prismatic`, `${d.n} · Prismatic`),
    subclass, elemente: [els[0] || 'Prismatic'], exotics: [d.n], aktivitaet: ['Auto-built'],
    warum: d.xp ? `${d.xp}: ${d.xd}` : d.xd,
    aspekte: aspekte.map((p) => p.n), fragmente: fragmente.map((p) => p.n),
    faehigkeiten: [...sup, ...gran, ...nah, ...kla].map((p) => p.n),
    erklaerung: [...aspekte, ...fragmente.slice(0, 2)].map(begruendung).filter(Boolean),
    stats: stats.length ? stats : ['Weapons', 'Health'], waffen: waffe ? [`Any ${waffe}`] : [],
    plan: [], quelle: 'Auto-built from Bungie game data', link: `https://www.light.gg/db/items/${hash}/`,
  };
}
