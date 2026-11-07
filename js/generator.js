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
    if (d.t !== 19 || !d.pc || !d.n || !d.d || /deprecated|no longer/i.test(d.d) || /^Empty /.test(d.n)) continue;
    // Stasis heißt in Bungies Daten anders: Aspekte = totems, Fragmente = trinkets.
    const m = d.pc.replace(/\.totems$/, '.aspects').replace(/\.trinkets$/, '.fragments').match(/^(titan|hunter|warlock|shared)\.(solar|arc|void|stasis|strand|prism)\.(aspects|fragments|supers|grenades|melee|class_abilities)$/);
    if (!m) continue;
    const key = `${m[1]}.${m[2]}.${m[3]}`;
    const liste = katalog.get(key) || [];
    if (!liste.some((x) => x.n === d.n)) liste.push({ hash: Number(h), n: d.n, d: d.d });
    katalog.set(key, liste);
  }
  return katalog;
}

// Spielmechaniken, die zwei Teile wirklich verbinden (statt Füllwörtern wie "target" oder "equipped").
const MECH = ['scorch', 'ignit', 'radiant', 'restoration', 'cure', 'jolt', 'blind', 'amplified', 'bolt charge', 'ionic trace', 'volatile', 'devour', 'suppress', 'weaken', 'invisib', 'overshield', 'freez', 'slow', 'shatter', 'frost armor', 'crystal', 'sever', 'suspend', 'unravel', 'tangle', 'threadling', 'woven mail', 'grenade', 'melee', 'super', 'class ability', 'rift', 'barricade', 'dodge', 'orb', 'airborne', 'reload', 'heal', 'finisher', 'precision', 'sprint', 'ammo', 'damage resistance', 'armor charge', 'transcendence', 'sunspot', 'firebolt', 'arc soul', 'void breach', 'stasis shard', 'firesprite', 'ward of dawn', 'well of radiance', 'buff', 'kinetic'];
const mech = (t) => { const x = (t || '').toLowerCase(); return MECH.filter((m) => x.includes(m)); };
function wahl(liste, text, anzahl) {
  const w = worte(text);
  const mt = new Set(mech(text));
  const roh = (text || '').toLowerCase();
  return [...(liste || [])].map((p) => {
    let s = 0;
    if (roh.includes(p.n.toLowerCase())) s += 20;
    for (const x of worte(`${p.n} ${p.d}`)) if (w.has(x)) s += 1;
    for (const x of mech(`${p.n} ${p.d}`)) if (mt.has(x)) s += 4;
    if (/[−-]\d+ (Melee|Grenade|Class|Super|Weapons|Health)/.test(p.d)) s -= 1;
    return { ...p, s };
  }).sort((a, b) => b.s - a.s || a.n.localeCompare(b.n)).slice(0, anzahl);
}

// Element aus Schlüsselwörtern: Verben wie "volatile" oder "scorch" verraten das Element, auch ohne dass es genannt wird.
const MERKMALE = {
  Void: /\bvoid\b|volatile|blink|nova|devour|suppress|weaken|overshield|invisib|vortex|bubble|ward of dawn|axion|scatter|handheld supernova/gi,
  Solar: /\bsolar\b|scorch|ignit|radiant|restor|healing grenade|cure|sunspot|well of radiance|daybreak|phoenix|firebolt|incandescent|golden gun|hammer/gi,
  Arc: /\barc\b|jolt|blind|amplified|ionic|arc soul|chain lightning|stormtrance|thundercrash|arc staff|lightning/gi,
  Stasis: /stasis|freez|slow|shatter|crystal|frost|winter's wrath|glacial|silence and squall|whisper/gi,
  Strand: /strand|unravel|sever|suspend|woven mail|threadling|tangle|grappl|needlestorm|bladefury|silkstrike/gi,
};
export function elementeAus(text) {
  if (/Light and Darkness|Prismatic|Transcendence/i.test(text || '')) return ['Prismatic'];
  const zahl = Object.entries(MERKMALE).map(([e, re]) => [e, ((text || '').match(re) || []).length]).filter(([, n]) => n).sort((a, b) => b[1] - a[1]);
  return zahl.map(([e]) => e);
}

// Heimat-Element je Exotic, von Hand gesetzt (Stichwörter allein raten oft falsch, z. B. Chromatic Fire → Stasis).
// V Void, S Solar, A Arc, St Stasis, Sd Strand, P Prismatic. Fehlt ein Eintrag, entscheiden die Stichwörter.
const HEIM={
'Helm of Saint-14':'V','Mk. 44 Stand Asides':'A','Mask of the Quiet One':'V','An Insurmountable Skullfort':'A','Doom Fang Pauldron':'V','Synthoceps':'P','Point-Contact Cannon Brace':'A','Crest of Alpha Lupi':'S','Hallowfire Heart':'S','Heart of Inmost Light':'A','Khepri\'s Horn':'S','No Backup Plans':'V','Ashen Wake':'S','Pyrogale Gauntlets':'S','Dunemarchers':'A','Blastwave Striders':'St','Hoarfrost-Z':'St','Second Chance':'V','The Path of Burning Steps':'S','Icefall Mantle':'St','Ursa Furiosa':'V','Phoenix Cradle':'S','Eternal Warrior':'A','Cuirass of the Falling Star':'A','Cadmus Ridge Lancecap':'St','Melas Panoplia':'S','Loreley Splendor Helm':'S','Abeyant Leap':'Sd','Wishful Ignorance':'Sd',
'Khepri\'s Sting':'V','Cyrtarachne\'s Facade':'Sd','Orpheus Rig':'V','Caliban\'s Hand':'S','Raiden Flux':'A','Young Ahamkara\'s Spine':'S','Graviton Forfeit':'V','Lucky Raspberry':'A','Gyrfalcon\'s Hauberk':'V','Mask of Bakris':'St','Shards of Galanor':'S','Shinobu\'s Vow':'A','Gwisin Vest':'V','Celestial Nighthawk':'S','Gifted Conviction':'A','Omnioculus':'V','Renewal Grasps':'St','Assassin\'s Cowl':'V','Raiju\'s Harness':'A','Liar\'s Handshake':'A','Relativism':'P',
'Speaker\'s Sight':'S','Geomag Stabilizers':'A','Promethium Spur':'S','Nothing Manacles':'V','Wings of Sacred Dawn':'S','Lunafaction Boots':'S','Rain of Fire':'S','Secant Filaments':'V','Boots of the Assembler':'S','Starfire Protocol':'S','Briarbinds':'V','Astrocyte Verse':'V','Rime-coat Raiment':'St','Nezarec\'s Sin':'V','Crown of Tempests':'A','Sunbracers':'S','Mataiodoxía':'Sd','Skull of Dire Ahamkara':'V','Vesper of Radius':'A','Stormdancer\'s Brace':'A','Fallen Sunstar':'A','Contraverse Hold':'V','Swarmers':'Sd','Ballidorse Wrathweavers':'St','Solipsism':'P','Dawn Chorus':'S','Osmiomancy Gloves':'St','Getaway Artist':'A','Eunoia':'S','Chromatic Fire':'S','Phoenix Protocol':'S'};
const KURZ = { V: 'Void', S: 'Solar', A: 'Arc', St: 'Stasis', Sd: 'Strand', P: 'Prismatic' };
// Waffentypen genau so, wie sie in Bungies Daten heißen; Mehrzahl im Text wird mitgefunden.
const WAFFEN = [['Linear Fusion Rifle', /linear fusion rifles?/i], ['Fusion Rifle', /(?<!linear )fusion rifles?/i], ['Trace Rifle', /trace rifles?/i], ['Auto Rifle', /auto rifles?/i], ['Pulse Rifle', /pulse rifles?/i], ['Scout Rifle', /scout rifles?/i], ['Sniper Rifle', /sniper rifles?/i], ['Hand Cannon', /hand cannons?/i], ['Submachine Gun', /submachine guns?/i], ['Machine Gun', /(?<!sub)machine guns?/i], ['Sidearm', /sidearms?/i], ['Shotgun', /shotguns?/i], ['Glaive', /glaives?/i], ['Sword', /swords?/i], ['Combat Bow', /\bbows?\b/i], ['Grenade Launcher', /grenade launchers?/i], ['Rocket Launcher', /rocket launchers?/i]];
let exoWaffen = null;
const exoWaffeIm = (text) => {
  exoWaffen ??= [...new Set(Object.values(defs.items).filter((x) => x.t === 3 && x.q === 6 && x.n?.length > 3).map((x) => x.n))];
  return exoWaffen.find((n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text));
};
// Gemeinsame Stichwörter zwischen Exotic und einem Teil: daraus wird das „Warum“.
const NAME = { ignit: 'ignitions', invisib: 'invisibility', freez: 'freeze', orb: 'Orbs of Power' };
const gemeinsam = (a, b) => { const w = new Set(mech(a)); return mech(b).filter((x) => w.has(x)).slice(0, 3).map((x) => NAME[x] || x); };
const STAT_WORT = [['Grenade', /grenade/i], ['Melee', /melee|punch|charged/i], ['Super', /super/i], ['Class', /class ability|dodge|rift|barricade|dive/i], ['Weapons', /weapon|reload|ammo|precision/i], ['Health', /heal|restor|damage resistance|overshield/i]];

export function baueIdee(hash, d) {
  const kl = KL[d.c];
  const text = `${d.xp || ''} ${d.xd || ''}`;
  const els = elementeAus(text);
  const heim = KURZ[HEIM[d.n]];
  const elName = heim || els[0] || 'Prismatic';
  const el = EL[elName];
  const k = plugs();
  const g = (key, n) => wahl(k.get(key), text, n);
  const aspekte = g(`${kl}.${el}.aspects`, 2);
  const fragmente = g(`shared.${el}.fragments`, el === 'prism' ? 5 : 4);
  const sup = g(`${kl}.${el}.supers`, 1);
  const gran = g(el === 'prism' ? `${kl}.prism.grenades` : `shared.${el}.grenades`, 1);
  const nah = g(`${kl}.${el}.melee`, 1);
  const kla = g(`${kl}.${el}.class_abilities`, 1);
  const stats = STAT_WORT.filter(([, re]) => re.test(d.xd || '')).map(([n]) => n).slice(0, 3);
  const typen = WAFFEN.filter(([, re]) => re.test(d.xd || '')).map(([n]) => n);
  const kinetisch = /kinetic weapons?/i.test(d.xd || '');
  const exoWaffe = exoWaffeIm(d.xd || '');
  const subclass = SUBCLASS[kl][el];
  // Echte Begründung: warum dieses Element, warum diese Teile, warum diese Waffen.
  const warum = [];
  warum.push(heim ? `${subclass}: ${d.n} is built around ${elName} (${elName === 'Prismatic' ? 'it mixes Light and Darkness' : 'its home element'}).` : els[0] ? `${subclass}: the exotic's text is mostly ${elName} (${(text.match(/\b(scorch|ignit\w*|radiant|restoration|cure|jolt|blind|amplified|bolt charge|volatile|devour|suppress\w*|weaken\w*|invisib\w*|overshield|freez\w*|slow\w*|shatter\w*|frost armor|crystal|sever\w*|suspend\w*|unravel\w*|tangle|threadling)\b/gi) || []).slice(0, 3).map((x) => x.toLowerCase()).join(', ') || elName}).` : `${subclass}: the exotic works with any element, Prismatic gives the most options.`);
  for (const p of aspekte) { const g = gemeinsam(text, `${p.n} ${p.d}`); if (g.length) warum.push(`${p.n}: feeds the exotic, both work with ${g.join(', ')}.`); }
  for (const p of fragmente.slice(0, 3)) { const g = gemeinsam(text, `${p.n} ${p.d}`); if (g.length) warum.push(`${p.n}: supports the loop (${g.join(', ')}).`); }
  if (exoWaffe) warum.push(`${exoWaffe}: the exotic names this weapon directly.`);
  else if (typen.length) warum.push(`${typen.join(' / ')}: the exotic only works with ${typen.length > 1 ? 'these weapon types' : 'this weapon type'}, so the exotic weapon is one too.`);
  if (kinetisch) warum.push('Kinetic weapons: the exotic triggers on Kinetic final blows, so the kinetic slot uses Kinetic damage only.');
  return {
    id: `idee-${hash}`, idee: true, klasse: d.c, name: `${d.n} · ${subclass}`,
    subclass, elemente: [elName], exotics: [d.n], aktivitaet: ['Auto-built'],
    warum: d.xp ? `${d.xp}: ${d.xd}` : d.xd,
    aspekte: aspekte.map((p) => p.n), fragmente: fragmente.map((p) => p.n),
    faehigkeiten: [...sup, ...gran, ...nah, ...kla].map((p) => p.n),
    erklaerung: warum, waffeTyp: typen, kinetisch, exoWaffe,
    stats: stats.length ? stats : ['Weapons', 'Health'], waffen: typen.map((t) => `Any ${t}`),
    plan: [], quelle: 'Auto-built from Bungie game data', link: `https://www.light.gg/db/items/${hash}/`,
  };
}
