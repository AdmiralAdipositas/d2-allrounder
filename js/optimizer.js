// Rüstungs-Optimizer mit Live-Leisten wie d2armorpicker: Klick setzt Mindestwert (5er-Schritte),
// die Leiste zeigt, was mit den anderen Mindestwerten noch erreichbar ist.
import * as bungie from './bungie.js';
import { defs } from './defs.js';
import { sammle, merkeAenderung, ARMOR_STATS, zumCharakter, ersatzAnlegen } from './vault.js';
import { meldung } from './app.js';
import { SUBCLASS } from './generator.js';
import * as modplan from './mods.js';

const BILD = 'https://www.bungie.net';
const KLASSE = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
const SLOTS = [3448274439, 3551918588, 14239492, 20886954, 1585787867];
const SKALA = 200;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const lies = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const speichere = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

let zustandO = lies('d2a.opt', { klasse: null, ziele: {}, bonus: {}, exotic: 0, mods: true, modGroesse: 'auto', fragQuelle: 'an' });
if (zustandO.mods && !zustandO.modAuto) { zustandO.modGroesse = 'auto'; zustandO.modAuto = 1; } // einmalig: Auto als Standard
if (!zustandO.fragQuelle) zustandO.fragQuelle = 'an';
if (zustandO.rang === 'wenig') zustandO.rang = 'total';

// Stat-Bonus der Fragmente (Armor 3.0: z. B. +10 Health); manche Fragmente geben auch Abzüge.
export function fragmentBonus(plugs) {
  const b = Object.fromEntries(ARMOR_STATS.map((n) => [n, 0]));
  for (const p of plugs || []) {
    const d = defs.items[p];
    if (!d || !/fragments$/.test(d.pc || '')) continue;
    for (const [h, v] of d.s || []) { const n = defs.stats?.[h]?.n; if (n in b) b[n] += v; }
  }
  return b;
}
const SUBCLASS_BUCKET = 3284755031;
// Loadouts liefern keine Sockel-Freigabe: nur so viele Fragmente zählen, wie die Aspekte Plätze öffnen (falls bekannt).
function nurFreie(plugs) {
  const cap = plugs.reduce((a, h) => a + (defs.items[h]?.ec || 0), 0);
  if (!cap) return plugs;
  let n = 0;
  return plugs.filter((h) => !/fragments$/.test(defs.items[h]?.pc || '') || ++n <= cap);
}
// Jedes Fragment einzeln mit seinen Stat-Änderungen (für die Anzeige).
export function fragmentListe(plugs) {
  const out = [];
  for (const p of plugs || []) {
    const d = defs.items[p];
    if (!d || !/fragments$/.test(d.pc || '')) continue;
    for (const [h, v] of d.s || []) { const n = defs.stats?.[h]?.n; if (ARMOR_STATS.includes(n)) out.push([d.n, n, v]); }
  }
  return out;
}
// Woher die Fragmente kommen: angelegte Subclass, ein Ingame-Loadout oder der Build aus dem Finder.
function fragmentQuelle(profil, cid, quelleWahl, build) {
  if (quelleWahl === 'aus') return { plugs: [], text: '' };
  if (quelleWahl === 'build' && build?.fragmente?.length) {
    const plugs = build.fragmente.map((n) => Object.keys(defs.items).find((h) => defs.items[h].n === n && /fragments$/.test(defs.items[h].pc || ''))).filter(Boolean);
    return { plugs, text: `fragments of ${build.name}` };
  }
  const sockets = profil.itemComponents?.sockets?.data || {};
  if (quelleWahl === 'an') {
    const sub = (profil.characterEquipment?.data?.[cid]?.items || []).find((i) => i.bucketHash === SUBCLASS_BUCKET);
    // Nur freigeschaltete Sockel zählen: ausgegraute Fragment-Plätze (zu wenig Aspekt-Kapazität) wirken im Spiel nicht.
    const plugs = (sockets[sub?.itemInstanceId]?.sockets || []).filter((x) => x.isEnabled !== false).map((x) => x.plugHash).filter(Boolean);
    return { plugs, text: sub ? `fragments of your equipped ${defs.items[sub.itemHash]?.n || 'subclass'}` : '' };
  }
  if (/^lo\d+$/.test(quelleWahl)) {
    const l = profil.characterLoadouts?.data?.[cid]?.loadouts?.[Number(quelleWahl.slice(2))];
    const alle = [...(profil.characterEquipment?.data?.[cid]?.items || []), ...(profil.characterInventories?.data?.[cid]?.items || [])];
    const hashVon = new Map(alle.map((y) => [y.itemInstanceId, y.itemHash]));
    const sub = (l?.items || []).find((x) => defs.items[hashVon.get(x.itemInstanceId)]?.b === SUBCLASS_BUCKET);
    return { plugs: nurFreie(sub?.plugItemHashes || []), text: `fragments of loadout ${defs.lo?.n?.[l?.nameHash] || Number(quelleWahl.slice(2)) + 1}` };
  }
  return { plugs: [], text: '' };
}
let ergebnisse = null;

const statName = (h) => defs.stats?.[h]?.n;
// Nur echte Rüstungs-Stats zählen; der Energiekosten-Wert im Mod wird ignoriert.
const armorTeil = (d) => (d?.s || []).filter(([h, v]) => v > 0 && ARMOR_STATS.includes(statName(h)));
const istStatMod = (p) => {
  const d = defs.items[p];
  return Boolean(d && d.t === 19 && /^enhancements\./.test(d.pc || '') && armorTeil(d).length === 1 && / Mod$/.test(d.n || '') && !/\//.test(d.n));
};
let modKarte = null;
// Stat-Mods: groß (+10, "Health Mod") oder klein (+5, "Minor Health Mod", kostet weniger Energie). Wahl über zustandO.modGroesse.
function statMods(groesse = zustandO.modGroesse === 5 ? 5 : 10) {
  modKarte = modKarte || {};
  if (modKarte[groesse]) return modKarte[groesse];
  const k = (modKarte[groesse] = {});
  for (const [h, d] of Object.entries(defs.items)) {
    if (!istStatMod(h)) continue;
    const [[sh, wert]] = armorTeil(d);
    const n = statName(sh);
    const name = groesse === 5 ? `Minor ${n} Mod` : `${n} Mod`;
    if (d.n === name && d.pc === 'enhancements.v2_general' && (!k[n] || (groesse === 5 ? k[n].wert > wert : k[n].wert < wert))) k[n] = { plug: Number(h), wert, name: d.n, icon: d.i, pc: d.pc };
  }
  return k;
}

function ruestung(profil, klasse) {
  return sammle(profil).filter((x) => x.st && SLOTS.includes(x.d.b) && (x.d.c === klasse || x.d.c === 3)).map((x) => {
    const basis = { ...x.st };
    let modSockel = -1;
    x.sockel.forEach((p, n) => {
      if (!istStatMod(p)) return;
      for (const [h, v] of armorTeil(defs.items[p])) basis[statName(h)] -= v;
      if (modSockel < 0) modSockel = n;
    });
    // Stat-Mods passen nur in den allgemeinen Mod-Sockel (Armor 3.0: enhancements.v2_general).
    modSockel = x.sockel.findIndex((p) => defs.items[p]?.pc === 'enhancements.v2_general');
    return { ...x, basis, modSockel, exo: x.d.q === 6, set: x.d.e ? defs.sets?.[x.d.e] : null };
  });
}

// Gewählte Sets (bis zu zwei, z. B. 2+2 oder 4) als Liste; alte Einzel-Wahl wird übernommen.
const setListe = (w) => (w.sets?.length ? w.sets : w.set ? [{ n: w.set, stk: w.setStk || 2 }] : []).filter((x) => x.n);
const exoModus = (w) => (w.exotic ? 'eins' : w.exoModus || 'any');

function gruppen(liste, wunsch, proFach) {
  const ziel = ARMOR_STATS.map((n) => wunsch.ziele[n] || 0);
  const wert = (i) => (wunsch.mods ? i.basis : i.st);
  const sets = setListe(wunsch);
  const modus = exoModus(wunsch);
  return SLOTS.map((b) => {
    let w = liste.filter((i) => i.d.b === b);
    if (modus === 'eins') { const ex = liste.find((i) => i.hash === wunsch.exotic); w = b === ex?.d.b ? w.filter((i) => i.d.n === ex.d.n) : w.filter((i) => !i.exo); }
    if (modus === 'none') w = w.filter((i) => !i.exo);
    const nutzen = (i) => ARMOR_STATS.reduce((a, n, k) => a + (wert(i)[n] || 0) * (ziel[k] ? 2 : 1), 0);
    const sortiert = [...w].sort((a, b2) => nutzen(b2) - nutzen(a));
    const wahl = new Set(sortiert.filter((i) => !i.exo).slice(0, proFach - ARMOR_STATS.length));
    for (const n of ARMOR_STATS) { const best = [...w].filter((i) => !i.exo).sort((a, b2) => (wert(b2)[n] || 0) - (wert(a)[n] || 0))[0]; if (best) wahl.add(best); }
    // Exotics: je Exotic-Name nur das beste Stück, damit jedes Exotic eine Chance hat (nicht nur das mit den höchsten Werten).
    const exoBest = new Map();
    for (const i of sortiert) if (i.exo && !exoBest.has(i.d.n)) exoBest.set(i.d.n, i);
    [...exoBest.values()].slice(0, modus === 'any' ? 3 : 99).forEach((i) => wahl.add(i));
    for (const st of sets) sortiert.filter((i) => i.set?.n === st.n).slice(0, 3).forEach((i) => wahl.add(i));
    return [...wahl].map((i) => ({ i, exo: i.exo, platz: i.modSockel >= 0 ? 1 : 0, w: ARMOR_STATS.map((n) => wert(i)[n] || 0) }));
  });
}

// Durchläuft alle Kombinationen; ruft pro Kombi fertig(summe, frei, weg) auf.
function durchlaufe(g, fertig) {
  const summe = ARMOR_STATS.map(() => 0);
  const weg = [];
  const gehe = (t, ex, frei) => {
    if (t === g.length) return fertig(summe, frei, weg);
    for (const x of g[t]) {
      if (x.exo && ex) continue;
      for (let n = 0; n < 6; n++) summe[n] += x.w[n];
      weg.push(x);
      gehe(t + 1, ex || x.exo, frei + x.platz);
      weg.pop();
      for (let n = 0; n < 6; n++) summe[n] -= x.w[n];
    }
  };
  gehe(0, false, 0);
}

// Warum gibt es kein Ergebnis? Erst fehlende Teile (Set, Exotic, Slot), dann erst die Mindestwerte.
const SLOTNAME = ['Helmet', 'Gauntlets', 'Chest', 'Legs', 'Class item'];
function grundLeer(liste, wunsch) {
  const ex = wunsch.exotic ? liste.find((i) => i.hash === wunsch.exotic) : null;
  const frei = SLOTS.filter((b) => b !== ex?.d.b);
  const teile = [];
  for (const st of setListe(wunsch)) {
    const da = frei.filter((b) => liste.some((i) => i.d.b === b && !i.exo && i.set?.n === st.n));
    if (da.length < st.stk) {
      const fehlt = frei.filter((b) => !da.includes(b)).map((b) => SLOTNAME[SLOTS.indexOf(b)]);
      teile.push(`You need ${st.stk} ${esc(st.n)} pieces in different slots${ex ? ` (not the ${SLOTNAME[SLOTS.indexOf(ex.d.b)].toLowerCase()}, that's your exotic)` : ''}, but you only have ${da.length}: ${da.map((b) => SLOTNAME[SLOTS.indexOf(b)]).join(', ') || 'none'}. Still needed: ${st.stk - da.length} of ${fehlt.join(', ')}.`);
    }
  }
  const leer = SLOTS.filter((b) => !liste.some((i) => i.d.b === b));
  if (leer.length) teile.push(`No armor for ${leer.map((b) => SLOTNAME[SLOTS.indexOf(b)]).join(', ')} on this class.`);
  if (teile.length) return teile.join(' ');
  return ARMOR_STATS.some((n) => wunsch.ziele[n]) ? 'No combination reaches these minimums. Lower one of them.' : 'No combination found with these settings. Try “Any (no set needed)” or another exotic.';
}
function rechne(liste, wunsch) {
  const mods = statMods();
  const modWert = ARMOR_STATS.map((n) => (wunsch.mods ? mods[n]?.wert || 0 : 0));
  const bonus = ARMOR_STATS.map((n) => (Number(wunsch.bonus[n]) || 0) + (wunsch.frag?.[n] || 0));
  const ziel = ARMOR_STATS.map((n) => wunsch.ziele[n] || 0);
  const sets = setListe(wunsch);
  const modus = exoModus(wunsch);
  const g = gruppen(liste, wunsch, 14);
  if (g.some((x) => !x.length)) return { max: ARMOR_STATS.map(() => 0), anzahl: 0, beste: [] };
  const max = ARMOR_STATS.map(() => 0);
  let anzahl = 0;
  const beste = [];
  // Reihenfolge für übrige Mods: erst deine Mindestwerte (höchster zuerst), sonst der Stat-Fokus des Builds, sonst alle.
  const fokus = (wunsch.build?.stats || []).map((n) => ARMOR_STATS.indexOf(n)).filter((n) => n >= 0);
  const reihe = ziel.some(Boolean) ? ARMOR_STATS.map((_, n) => n).filter((n) => ziel[n]).sort((a, b) => ziel[b] - ziel[a]) : fokus.length ? fokus : ARMOR_STATS.map((_, n) => n);
  durchlaufe(g, (summe, frei, weg) => {
    for (const st of sets) if (weg.filter((x) => x.i.set?.n === st.n).length < st.stk) return;
    const s = summe.map((v, n) => v + bonus[n]);
    const noetig = s.map((v, n) => (v >= ziel[n] ? 0 : modWert[n] ? Math.ceil((ziel[n] - v) / modWert[n]) : Infinity));
    const alle = noetig.reduce((a, b) => a + b, 0);
    for (let n = 0; n < 6; n++) {
      const andere = alle - noetig[n];
      if (andere <= frei) max[n] = Math.min(SKALA, Math.max(max[n], s[n] + (frei - andere) * modWert[n]));
    }
    if (alle > frei) return;
    anzahl += 1;
    // Rest-Mods auf den Stat mit dem größten Abstand zur nächsten 10.
    const plus = noetig.map((k, n) => k * modWert[n]);
    let rest = frei - alle;
    const gesamt = s.reduce((a, v, n) => a + v + plus[n], 0) + rest * Math.max(...modWert);
    const wertung = gesamt + bewerte(wunsch, weg, s, plus, ziel);
    const exoName = weg.find((x) => x.exo)?.i.d.n || '—';
    // "Vary exotics": pro Exotic nur die beste Kombi behalten, damit du verschiedene Exotics nebeneinander siehst.
    const gleich = modus === 'vary' ? beste.findIndex((b) => b.exoName === exoName) : -1;
    if (gleich >= 0 && beste[gleich].wertung >= wertung) return;
    if (gleich < 0 && beste.length === 8 && wertung <= beste[7].wertung) return;
    const extra = ARMOR_STATS.map(() => 0);
    // Reihum verteilen, damit nicht alles auf einem Stat landet; nie über 200.
    let schritt = 0;
    while (rest > 0 && schritt < 60) { const n = reihe[schritt % reihe.length]; schritt += 1; if (!modWert[n] || s[n] + plus[n] + extra[n] + modWert[n] > SKALA) continue; extra[n] += modWert[n]; rest -= 1; }
    if (gleich >= 0) beste.splice(gleich, 1);
    // Auto: wo +5 reicht, um das Minimum zu halten, statt +10 nehmen (spart Rüstungsenergie für Firepower & Co.).
    const klein = ARMOR_STATS.map(() => 0);
    if (wunsch.modGroesse === 'auto') for (let n = 0; n < 6; n++) { while (noetig[n] - klein[n] > 0 && s[n] + plus[n] - (klein[n] + 1) * 5 >= ziel[n]) klein[n] += 1; }
    beste.push({ wertung, exoName, items: weg.map((x) => x.i), werte: s.map((v, n) => v + plus[n] + extra[n] - klein[n] * 5), modsJeStat: plus.map((v, n) => (v + extra[n]) / (modWert[n] || 1)), klein });
    beste.sort((a, b) => b.wertung - a.wertung);
    if (beste.length > 8) beste.pop();
  });
  return { max, anzahl, beste };
}

// Rangfolge-Modi: Zuschlag auf die Gesamtsumme. Erklärung steht im UI (RANG).
export const RANG = {
  total: ['Highest total', 'The combination with the most stat points overall wins.'],
  ziele: ['My stats first', 'Points in the stats you set a minimum for count triple, so extras land where you want them.'],
  sets: ['Most set bonuses', 'Combinations with active 2- or 4-piece set bonuses come first, then by total.'],
};
function bewerte(wunsch, weg, s, plus, ziel) {
  const r = wunsch.rang || 'total';
  if (r === 'ziele') {
    const fokus = ziel.some(Boolean) ? ziel.map(Boolean) : ARMOR_STATS.map((n) => (wunsch.build?.stats || []).includes(n));
    return s.reduce((a, v, n) => a + (fokus[n] ? (v + plus[n]) * 2 : 0), 0);
  }
  if (r === 'sets') { const z = new Map(); for (const x of weg) if (x.i.set) z.set(x.i.set.n, (z.get(x.i.set.n) || 0) + 1); return [...z.values()].reduce((a, c) => a + (c >= 4 ? 120 : c >= 2 ? 40 : 0), 0); }
  return 0;
}

// Jedes Set bekommt eine feste Farbe, damit gleiche Sets auf einen Blick zusammengehören.
const setFarbe = (n) => { let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${h} 70% 62%)`; };

function zuteilung(b) {
  const gross = statMods(zustandO.modGroesse === 5 ? 5 : 10), mini = statMods(5);
  const offen = ARMOR_STATS.flatMap((n, j) => Array(b.modsJeStat[j] || 0).fill(0).map((_, k) => (k < (b.klein?.[j] || 0) ? mini[n] : gross[n])));
  const mods = { get: (x) => x };
  const z = new Map();
  for (const it of b.items) if (it.modSockel >= 0 && offen.length) z.set(it.id, mods.get(offen.shift()));
  return z;
}

function setBoni(items) {
  const z = new Map();
  for (const i of items) if (i.set) z.set(i.set, (z.get(i.set) || 0) + 1);
  return [...z].flatMap(([s, n]) => s.p.filter((p) => p.c <= n).map((p) => ({ ...p, set: s.n })));
}

// Von außen (Build Finder) mit Exotic und Zielen öffnen.
export function setzeOptimizer(werte) { zustandO = { ...zustandO, build: null, ...werte, ziele: { ...werte.ziele } }; if (werte.build?.fragmente?.length) zustandO.fragQuelle = 'build'; else if (zustandO.fragQuelle === 'build') zustandO.fragQuelle = 'an'; speichere('d2a.opt', zustandO); }

export function zeigeOptimizer(haupt, zustand) {
  const chars = Object.values(zustand.profil.characters?.data || {}).sort((a, b) => new Date(b.dateLastPlayed) - new Date(a.dateLastPlayed));
  if (zustandO.klasse === null || !chars.some((c) => c.classType === zustandO.klasse)) zustandO.klasse = chars[0].classType;
  const zeichne = () => {
    const roh = ruestung(zustand.profil, zustandO.klasse);
    const aus = new Set(zustandO.aus || []); const fest = zustandO.fest || {};
    // Gesperrte Teile: nur dieses Teil im Fach. Ausgeschlossen: fliegt raus.
    const festIds = new Set(Object.values(fest));
    const festFach = new Set(roh.filter((i) => festIds.has(i.id)).map((i) => i.d.b));
    const liste = roh.filter((i) => !aus.has(i.id) && (!festFach.has(i.d.b) || festIds.has(i.id)));
    const kurz = (id) => roh.find((i) => i.id === id);
    const exotics = [...new Map(liste.filter((i) => i.exo).map((i) => [i.d.n, i])).values()].sort((a, b) => a.d.n.localeCompare(b.d.n));
    if (zustandO.exotic && !liste.some((e) => e.hash === zustandO.exotic)) zustandO.exotic = 0;
    if (!zustandO.sets && zustandO.set) { zustandO.sets = [{ n: zustandO.set, stk: zustandO.setStk || 2 }]; delete zustandO.set; }
    zustandO.sets = zustandO.sets || [];
    zustandO.cid = chars.find((c) => c.classType === zustandO.klasse)?.characterId;
    const charF = chars.find((c) => c.classType === zustandO.klasse);
    const fq = fragmentQuelle(zustand.profil, charF?.characterId, zustandO.fragQuelle, zustandO.build);
    zustandO.frag = fragmentBonus(fq.plugs);
    const fragL = fragmentListe(fq.plugs);
    let r = rechne(liste, zustandO);
    // Kein Ergebnis wegen des Sets? Dann automatisch die beste Lösung mit weniger Set-Teilen zeigen und das ehrlich sagen.
    let ersatzHinweis = '';
    if (!r.beste.length && zustandO.sets.length) {
      const grund = grundLeer(liste, zustandO);
      for (const [sets, text] of [[[{ ...zustandO.sets[0], stk: 2 }], `2 pieces of ${zustandO.sets[0].n}`], [[], 'no set']]) {
        if (zustandO.sets[0].stk === 2 && sets.length) continue;
        const alt = rechne(liste, { ...zustandO, sets });
        if (alt.beste.length) { r = alt; ersatzHinweis = `<p class="ohinweis">${grund}<br><b>Showing the best result with ${esc(text)} instead.</b></p>`; break; }
      }
    }
    ergebnisse = r.beste;
    speichere('d2a.opt', zustandO);
    const mods = statMods();
    const bd = zustandO.build;
    const charJetzt = chars.find((c) => c.characterId && c.classType === zustandO.klasse);
    const slots = zustand.profil.characterLoadouts?.data?.[charJetzt?.characterId]?.loadouts || [];
    const slotWahl = `<label class="slotwahl">Save as in-game loadout <select id="slot"><option value="-1">Don't save</option>${slots.map((l, i) => `<option value="${i}" ${String(i) === String(zustandO.slot) ? 'selected' : ''}>Slot ${i + 1}${(l.items || []).some((x) => x.itemInstanceId && x.itemInstanceId !== '0') ? ` · ${esc(defs.lo?.n?.[l.nameHash] || 'used')} (overwrite)` : ' · empty'}</option>`).join('')}</select></label>
      <label class="haken"><input type="checkbox" id="leeren" ${zustandO.leeren ? 'checked' : ''}> Clear slot first</label>`;
    const banner = bd ? `<div class="build-banner"><div><small>Building</small><b>${esc(bd.name)}</b><span>${esc([bd.subclass, ...bd.faehigkeiten, ...bd.aspekte, ...bd.fragmente].filter(Boolean).join(' · '))}</span></div>
      <div class="bb-rechts">${slotWahl}<button class="chip" id="ohneBuild" title="Only armor">✕ Armor only</button></div></div>` : '';
    haupt.innerHTML = `${banner}<div class="kopf"><h1>Optimizer</h1><span class="platz"></span><div class="chips">${chars.map((c) => `<button class="chip" data-kl="${c.classType}" aria-pressed="${c.classType === zustandO.klasse}">${KLASSE[c.classType]}</button>`).join('')}</div></div>
    <div class="optgrid"><section class="karte optlinks">
      <div class="oschritt"><h3><span>1</span>What you bring</h3>
        <label class="ozeile">Subclass & fragments from <select id="fragWahl"><option value="an" ${zustandO.fragQuelle === 'an' ? 'selected' : ''}>What ${KLASSE[zustandO.klasse]} has equipped now</option>${bd?.fragmente?.length ? `<option value="build" ${zustandO.fragQuelle === 'build' ? 'selected' : ''}>The build “${esc(bd.name)}”</option>` : ''}${slots.map((l, i) => ((l.items || []).some((x) => x.itemInstanceId && x.itemInstanceId !== '0') ? `<option value="lo${i}" ${zustandO.fragQuelle === `lo${i}` ? 'selected' : ''}>In-game loadout ${i + 1} · ${esc(defs.lo?.n?.[l.nameHash] || '')}</option>` : '')).join('')}<option value="aus" ${zustandO.fragQuelle === 'aus' ? 'selected' : ''}>Nothing (ignore fragments)</option></select></label>
        <p class="ohilfe">${fragL.length ? `Fragments change your stats: ${fragL.map(([f, n, v]) => `<b class="${v < 0 ? 'minus' : 'plus'}" title="${esc(f)}">${v > 0 ? '+' : ''}${v} ${n}</b>`).join(', ')}${ARMOR_STATS.filter((n) => fragL.filter((x) => x[1] === n).length > 1).length ? ` · net: ${ARMOR_STATS.filter((n) => fragL.some((x) => x[1] === n)).map((n) => `${zustandO.frag[n] > 0 ? '+' : ''}${zustandO.frag[n]} ${n}`).join(', ')}` : ''}. Already counted below. <small>(${esc([...new Set(fragL.map((x) => x[0]))].join(', '))})</small>` : fq.text ? 'These fragments don\'t change any stat.' : 'No fragments counted.'}</p></div>
      <div class="oschritt"><h3><span>2</span>Minimum stats</h3><p class="ohilfe">Drag a bar to the value you need (steps of 5). Gold = your minimum, violet = the most you can still reach.</p>
      ${ARMOR_STATS.map((n, k) => {
        const z = zustandO.ziele[n] || 0;
        return `<div class="sbar"><span class="sname">${n}</span>
          <div class="sleiste" data-s="${n}" title="Click or drag to set a minimum">
            <i class="smax" style="width:${(r.max[k] / SKALA) * 100}%"></i><i class="sziel" style="width:${(z / SKALA) * 100}%"></i>
            ${[50, 100, 150].map((m) => `<i class="smark" style="left:${(m / SKALA) * 100}%"></i>`).join('')}</div>
          <span class="swert"><b>${z}</b> / ${r.max[k]}</span></div>`;
      }).join('')}<button class="chip" id="reset">Reset minimums</button></div>
      <div class="oschritt"><h3><span>3</span>Exotic & armor set <small>optional</small></h3>
        <label class="ozeile">Exotic <select id="exo">${[['any', 'Let the optimizer choose'], ['vary', 'Show one result per exotic'], ['none', 'No exotic']].map(([v, t]) => `<option value="${v}" ${!zustandO.exotic && (zustandO.exoModus || 'any') === v ? 'selected' : ''}>${t}</option>`).join('')}<optgroup label="Use this exotic">${exotics.map((e) => `<option value="${e.hash}" ${e.hash === zustandO.exotic ? 'selected' : ''}>${esc(e.d.n)} · ${esc(e.d.k || '')}</option>`).join('')}</optgroup></select></label>
        ${[0, 1].map((k) => { const st = zustandO.sets[k] || {}; if (k === 1 && !(zustandO.sets[0]?.n && zustandO.sets[0].stk === 2)) return ''; return `<label class="ozeile">${k ? 'Second set (2 pieces)' : 'Armor set'} <select data-setn="${k}"><option value="">${k ? 'None' : 'Any (no set needed)'}</option>${[...new Set(liste.filter((i) => i.set).map((i) => i.set.n))].sort().filter((n) => k === 0 || n !== zustandO.sets[0]?.n).map((n) => `<option ${n === st.n ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>${st.n && k === 0 ? `<label class="ozeile">Pieces of it <select data-setk="0"><option value="2" ${st.stk !== 4 ? 'selected' : ''}>2 – one bonus, room for a second set</option><option value="4" ${st.stk === 4 ? 'selected' : ''}>4 – both bonuses</option></select></label>` : ''}`; }).join('')}</div>
      <details class="oschritt omehr"><summary>More options</summary>
        <label class="ozeile">Sort results by <select id="rang">${Object.entries(RANG).map(([v, [t]]) => `<option value="${v}" ${(zustandO.rang || 'total') === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label><p class="ohilfe">${esc(RANG[zustandO.rang || 'total'][1])}</p>
        <label class="ozeile">Stat mods <select id="modWahl"><option value="auto" ${zustandO.mods && zustandO.modGroesse === 'auto' ? 'selected' : ''}>Automatic (recommended)</option><option value="10" ${zustandO.mods && zustandO.modGroesse === 10 ? 'selected' : ''}>Only +10 mods</option><option value="5" ${zustandO.mods && zustandO.modGroesse === 5 ? 'selected' : ''}>Only +5 mods</option><option value="0" ${!zustandO.mods ? 'selected' : ''}>No stat mods</option></select></label>
        <p class="ohilfe">Automatic: the optimizer adds one stat mod per piece where it helps and uses the cheaper +5 version whenever that already reaches your minimum, leaving energy for Firepower, Siphons and co.</p>
        <div class="obonus"><small>Extra stats you add yourself (e.g. font mods):</small>${ARMOR_STATS.map((n) => `<label>${n.slice(0, 3)} +<input type="number" step="5" data-bonus="${n}" value="${zustandO.bonus[n] || 0}"></label>`).join('')}</div>
      </details>
      <p class="anzahl"><b>${r.anzahl.toLocaleString()}</b> armor combinations reach your minimums.</p><div class="opt-sprung"><button class="haupt-knopf" data-zuerg>Show results (${r.anzahl.toLocaleString()}) ↓</button></div></section>
    <section><div class="okopf2"><h2>Best combinations</h2><span class="ansicht-w"><button class="chip ${zustandO.tabelle ? '' : 'an'}" data-oview="karten" title="Cards">▤ Cards</button><button class="chip ${zustandO.tabelle ? 'an' : ''}" data-oview="tabelle" title="Compact table">☰ Table</button></span></div>
      ${festIds.size || aus.size ? `<div class="ofest">${[...festIds].map((id) => kurz(id)).filter(Boolean).map((i) => `<button class="chip" data-unfest="${i.id}" title="Unlock">📌 ${esc(i.d.n)} ✕</button>`).join('')}${aus.size ? `<button class="chip" data-unaus="1" title="Bring excluded pieces back">⛔ ${aus.size} excluded · reset</button>` : ''}</div>` : ''}
      ${zustandO.tabelle && r.beste.length ? `<table class="otab"><thead><tr><th>#</th><th>Armor</th>${ARMOR_STATS.map((n) => `<th title="${n}">${n.slice(0, 3)}</th>`).join('')}<th>Tot</th><th></th></tr></thead><tbody>${r.beste.map((b, k) => `<tr><td class="onr">${k + 1}</td><td><span class="otitems">${b.items.map((i) => `<i class="ic ${i.exo ? 'exotic' : ''} ${festIds.has(i.id) ? 'fest' : ''}" data-oid="${k}:${i.id}" style="background-image:url(${BILD}${i.d.i})"></i>`).join('')}</span></td>${ARMOR_STATS.map((n, j) => `<td class="${b.werte[j] >= (zustandO.ziele[n] || 0) && zustandO.ziele[n] ? 'ok' : ''} ${b.werte[j] >= 100 ? 'hoch' : ''}">${b.werte[j]}</td>`).join('')}<td class="otot">${b.werte.reduce((a, v) => a + v, 0)}</td><td><button class="chip" data-equip="${k}" title="Equip">⇩</button></td></tr>`).join('')}</tbody></table><small class="klegende">Tap an armor piece to 📌 lock or ⛔ exclude it.</small>` : ''}
      <div class="okarten" ${zustandO.tabelle && r.beste.length ? 'hidden' : ''}><details class="warum"><summary>How does the optimizer pick?</summary><p>It looks at every armor piece of this class you own (vault and characters), adds automatic stat mods and your fragments, and keeps the combinations that reach all your minimums.</p><p><b>Rank: ${esc(RANG[zustandO.rang || 'total'][0])}.</b> ${esc(RANG[zustandO.rang || 'total'][1])}</p>
      <p><b>Exotic:</b> ${zustandO.exotic ? 'only the exotic you picked.' : { any: 'the one that gives the best result wins. If the same exotic shows up every time, it simply has the best stats — use “Compare exotics” or pick one.', vary: 'one card per exotic (and one without), best combination each.', none: 'legendary pieces only.' }[zustandO.exoModus || 'any']}</p>
      <p><b>Sets:</b> ${zustandO.sets.length ? zustandO.sets.map((x) => `${esc(x.n)} ×${x.stk}`).join(' + ') : 'no requirement. Pick a set (2 pieces) and a second set (2 pieces) for two 2-piece bonuses, or 4 pieces for both bonuses of one set.'}</p>
      <p>Per slot the best ~14 pieces for your minimums are compared; every combination that reaches all minimums (with up to one stat mod per piece) is counted.</p></details>${ersatzHinweis}${r.beste.map((b, k) => `<article class="kombi"><div class="krang"><b>#${k + 1}</b><span>Total ${b.werte.reduce((a, v) => a + v, 0)}</span>${zustandO.exoModus === 'vary' && !zustandO.exotic ? `<em class="schip an" style="--sf:#e9c46a">${esc(b.exoName === '—' ? 'No exotic' : b.exoName)}</em>` : ''}${(() => { const w = b.items.filter((i) => i.ort !== zustandO.cid).length; return `<small class="kweg">${w ? `${w} of 5 pieces come from the vault or another character – moved for you when you equip` : 'All pieces are already on this character'}</small>`; })()}${(() => { const z = new Map(); b.items.forEach((i) => i.set && z.set(i.set.n, (z.get(i.set.n) || 0) + 1)); return [...z].sort((a, c) => c[1] - a[1]).map(([n, c]) => `<em class="schip ${c >= 2 ? 'an' : ''}" style="--sf:${setFarbe(n)}">${esc(n)} ${c}/4</em>`).join(''); })()}</div>
      ${(() => { const z = zuteilung(b); return `<div class="kitems">${b.items.map((i) => { const m = z.get(i.id); return `<div class="kteil"><i class="ic ${i.exo ? 'exotic' : ''} ${festIds.has(i.id) ? 'fest' : ''}" data-oid="${k}:${i.id}" style="background-image:url(${BILD}${i.d.i})"><i class="ort ${i.ort === 'tresor' ? 'tresor' : 'char'}"></i></i>${m ? `<span class="kmodl" title="${esc(m.name)} goes on this piece"><i style="background-image:url(${BILD}${m.icon})"></i>+${m.wert} ${esc(m.name.replace(/ Mod$/, ''))}</span>` : '<span class="kmodl leer">no stat mod</span>'}<small style="--sf:${i.set ? setFarbe(i.set.n) : 'transparent'}" class="kset-l ${i.set && b.items.filter((x) => x.set?.n === i.set.n).length >= 2 ? 'aktivset' : ''}">${i.exo ? 'Exotic' : i.set ? `${esc(i.set.n)} ${b.items.filter((x) => x.set?.n === i.set.n).length}/4` : '–'}</small></div>`; }).join('')}</div>`; })()}
      <div class="kwerte">${ARMOR_STATS.map((n, j) => { const basis = b.items.reduce((a, i) => a + ((zustandO.mods ? i.basis : i.st)[n] || 0), 0); const mod = b.werte[j] - basis - (zustandO.frag?.[n] || 0) - (Number(zustandO.bonus[n]) || 0); const fr = zustandO.frag?.[n] || 0; const ok = b.werte[j] >= (zustandO.ziele[n] || 0); return `<span class="${zustandO.ziele[n] ? (ok ? 'erreicht' : '') : ''}" title="${n}: armor ${basis}${mod ? ` + mods ${mod}` : ''}${fr ? ` ${fr > 0 ? '+' : '−'} fragments ${Math.abs(fr)}` : ''}${zustandO.bonus[n] ? ` + extra ${zustandO.bonus[n]}` : ''}${zustandO.ziele[n] ? ` · your minimum ${zustandO.ziele[n]}` : ''}"><small>${n}</small><b>${b.werte[j]}</b><i><u style="width:${Math.min(100, b.werte[j] / 2)}%"></u></i>${mod || fr ? `<em>${basis}${mod ? `<ins>+${mod}</ins>` : ''}${fr ? `<ins class="${fr < 0 ? 'minus' : ''}">${fr > 0 ? '+' : '−'}${Math.abs(fr)}</ins>` : ''}</em>` : ''}</span>`; }).join('')}</div>
      <small class="klegende">Small numbers: armor + <ins>mods</ins> + <ins>fragments</ins>. Hover a stat for details.</small>
      ${b.modsJeStat.some(Boolean) ? `<div class="kmods">${ARMOR_STATS.map((n, j) => { const k5 = b.klein?.[j] || 0, k10 = (b.modsJeStat[j] || 0) - k5; const m5 = statMods(5)[n]; return `${k10 ? `<span><i style="background-image:url(${BILD}${mods[n]?.icon || ''})"></i>${k10}× ${esc(mods[n]?.name || n)} <b>+${mods[n]?.wert || ''}</b></span>` : ''}${k5 ? `<span><i style="background-image:url(${BILD}${m5?.icon || ''})"></i>${k5}× ${esc(m5?.name || n)} <b>+5</b></span>` : ''}`; }).join('')}</div>` : ''}
      ${(() => { const z = new Map(); b.items.forEach((i) => i.set && z.set(i.set.n, (z.get(i.set.n) || 0) + 1)); const aktiv = [...z].filter(([, n]) => n >= 2); return aktiv.length ? '' : '<small class="kmods">No set bonus active (no 2 pieces of the same set). Pick a set above to force one.</small>'; })()}
      ${setBoni(b.items).map((p) => `<div class="kset"><b>${esc(p.set)} ${p.c}-piece · ${esc(p.n)}</b><span>${esc(p.d)}</span></div>`).join('')}
      <button class="haupt-knopf" data-equip="${k}">${bd ? 'Equip full build' : 'Equip on'} ${KLASSE[zustandO.klasse]}</button></article>`).join('') || `<p class="leer">${grundLeer(liste, zustandO)}</p>`}</div></section></div>`;
  };
  zeichne();

  haupt.onclick = async (e) => {
    const kl = e.target.closest('[data-kl]');
    if (kl) { zustandO.klasse = Number(kl.dataset.kl); return zeichne(); }
    if (e.target.id === 'reset') { zustandO.ziele = {}; return zeichne(); }
    if (e.target.closest('#ohneBuild')) { zustandO.build = null; if (zustandO.fragQuelle === 'build') zustandO.fragQuelle = 'an'; return zeichne(); }
    if (e.target.closest('[data-zuerg]')) return haupt.querySelector('.okopf2')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const ov = e.target.closest('[data-oview]');
    if (ov) { zustandO.tabelle = ov.dataset.oview === 'tabelle'; return zeichne(); }
    const uf = e.target.closest('[data-unfest]');
    if (uf) { for (const [b, id] of Object.entries(zustandO.fest || {})) if (id === uf.dataset.unfest) delete zustandO.fest[b]; return zeichne(); }
    if (e.target.closest('[data-unaus]')) { zustandO.aus = []; return zeichne(); }
    const pa = e.target.closest('[data-opop]');
    if (pa) {
      const [was, id] = pa.dataset.opop.split(':'); document.querySelector('.opop')?.remove();
      const it = ruestung(zustand.profil, zustandO.klasse).find((i) => i.id === id); if (!it) return;
      if (was === 'fest') { zustandO.fest = { ...(zustandO.fest || {}) }; if (zustandO.fest[it.d.b] === id) delete zustandO.fest[it.d.b]; else zustandO.fest[it.d.b] = id; }
      if (was === 'aus') { zustandO.aus = [...new Set([...(zustandO.aus || []), id])]; for (const [b, f] of Object.entries(zustandO.fest || {})) if (f === id) delete zustandO.fest[b]; }
      return zeichne();
    }
    const teil = e.target.closest('[data-oid]');
    if (teil) {
      if (e.pointerType !== 'mouse') zeigeTeil(teil, true);
      document.querySelector('.opop')?.remove();
      const id = teil.dataset.oid.split(':')[1]; const istFest = Object.values(zustandO.fest || {}).includes(id);
      const pop = document.createElement('div'); pop.className = 'opop';
      pop.innerHTML = `<button data-opop="fest:${id}">📌 ${istFest ? 'Unlock' : 'Lock this piece'}</button><button data-opop="aus:${id}">⛔ Exclude</button>`;
      haupt.append(pop); if (tipp && e.pointerType === 'mouse') tipp.hidden = true;
      const r = teil.getBoundingClientRect(), h = haupt.getBoundingClientRect();
      pop.style.left = `${(r.left - h.left) / d2aZ()}px`; pop.style.top = `${(r.bottom - h.top + 4) / d2aZ()}px`;
      return;
    }
    if (!e.target.closest('.opop')) document.querySelector('.opop')?.remove();
    const eq = e.target.closest('[data-equip]');
    if (eq) vorschau(ergebnisse[Number(eq.dataset.equip)], zustand, chars.find((c) => c.classType === zustandO.klasse), eq);
  };
  // Leisten ziehen oder klicken, rastet in 5er-Schritten ein; gerechnet wird beim Loslassen.
  const wertAus = (leiste, x) => { const r = leiste.getBoundingClientRect(); return Math.max(0, Math.min(SKALA, Math.round((((x - r.left) / r.width) * SKALA) / 5) * 5)); };
  haupt.onpointerdown = (e) => {
    const leiste = e.target.closest('.sleiste');
    if (!leiste) return;
    e.preventDefault();
    leiste.setPointerCapture(e.pointerId);
    const zeige = (x) => { const w = wertAus(leiste, x); leiste.querySelector('.sziel').style.width = `${(w / SKALA) * 100}%`; leiste.parentElement.querySelector('.swert b').textContent = w; return w; };
    let w = zeige(e.clientX);
    leiste.onpointermove = (ev) => { w = zeige(ev.clientX); };
    leiste.onpointerup = () => { leiste.onpointermove = leiste.onpointerup = null; zustandO.ziele[leiste.dataset.s] = w; zeichne(); };
  };
  // Hover (Maus) bzw. Antippen (Handy) zeigt Teil, Set, Stats und den Mod, der draufkommt.
  const tipp = document.querySelector('#tipp');
  const zeigeTeil = (el) => {
    const [k, id] = el.dataset.oid.split(':');
    const b = ergebnisse[Number(k)];
    const i = b?.items.find((x) => x.id === id);
    if (!i) return;
    const m = zuteilung(b).get(i.id);
    tipp.innerHTML = `<b>${esc(i.d.n)}</b><small>${esc(i.d.k)}${i.set ? ` · ${esc(i.set.n)}` : ''}${i.exo ? ' · Exotic' : ''} · ${i.ort === 'tresor' ? 'Vault' : 'Character'}</small>
      <table class="tstat">${ARMOR_STATS.map((n) => `<tr><td>${n}</td><td>${i.st[n]}</td></tr>`).join('')}<tr class="summe"><td>Total</td><td>${i.st.Total}</td></tr></table>
      ${m ? `<div class="tmod"><i style="background-image:url(${BILD}${m.icon})"></i>Add ${esc(m.name)} (+${m.wert})</div>` : i.modSockel < 0 ? '<small>No free stat mod slot.</small>' : ''}
      ${i.set ? `<div class="tset"><b>${esc(i.set.n)}</b>${i.set.p.map((p) => `<span><em>${p.c}-piece · ${esc(p.n)}</em> ${esc(p.d)}</span>`).join('')}</div>` : ''}${i.d.xd ? `<p class="tt"><b class="tgold">${esc(i.d.xp || 'Exotic perk')}</b> ${esc(i.d.xd)}</p>` : ''}<small class="thint">Hold Shift to pin</small>`;
    tipp.hidden = false;
    const r = el.getBoundingClientRect(), t = tipp.getBoundingClientRect();
    tipp.style.left = `${(Math.max(8, Math.min(r.right + 8, innerWidth - t.width - 8))) / d2aZ()}px`;
    tipp.style.top = `${(Math.max(8, Math.min(r.top, innerHeight - t.height - 8))) / d2aZ()}px`;
  };
  document.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' && !e.target.closest('[data-oid]')) tipp.hidden = true; });
  haupt.onpointerover = (e) => { const el = e.target.closest('[data-oid]'); if (el && e.pointerType === 'mouse') zeigeTeil(el); };
  haupt.onpointerout = (e) => { if (e.target.closest('[data-oid]') && e.pointerType === 'mouse') tipp.hidden = true; };
  haupt.onchange = (e) => {
    if (e.target.id === 'exo') { const v = e.target.value; zustandO.exotic = /^\d+$/.test(v) ? Number(v) : 0; if (!zustandO.exotic) zustandO.exoModus = v; }
    if (e.target.id === 'rang') zustandO.rang = e.target.value;
    if (e.target.dataset.setn) { const k = Number(e.target.dataset.setn); const n = e.target.value; if (!n) zustandO.sets = zustandO.sets.slice(0, k); else zustandO.sets[k] = { n, stk: k ? 2 : zustandO.sets[0]?.stk || 2 }; return zeichne(); }
    if (e.target.dataset.setk) { zustandO.sets[0].stk = Number(e.target.value); if (zustandO.sets[0].stk === 4) zustandO.sets = zustandO.sets.slice(0, 1); return zeichne(); }
    if (e.target.id === 'modWahl') { const v = e.target.value; zustandO.mods = v !== '0'; if (zustandO.mods) zustandO.modGroesse = v === 'auto' ? 'auto' : Number(v); }
    if (e.target.id === 'fragWahl') {
      zustandO.fragQuelle = e.target.value;
      // Ein Ingame-Loadout bringt auch sein Exotic mit: dann gezielt mit diesem Exotic suchen.
      if (/^lo\d+$/.test(e.target.value)) {
        const cid = chars.find((c) => c.classType === zustandO.klasse)?.characterId;
        const l = zustand.profil.characterLoadouts?.data?.[cid]?.loadouts?.[Number(e.target.value.slice(2))];
        const ids = new Set((l?.items || []).map((x) => x.itemInstanceId));
        const exo = ruestung(zustand.profil, zustandO.klasse).find((i) => i.exo && ids.has(i.id));
        if (exo) { zustandO.exotic = exo.hash; meldung(`Using ${exo.d.n} from that loadout.`); }
      }
    }
    if (e.target.id === 'slot') { zustandO.slot = Number(e.target.value); speichere('d2a.opt', zustandO); return; }
    if (e.target.id === 'leeren') { zustandO.leeren = e.target.checked; speichere('d2a.opt', zustandO); return; }
    if (e.target.dataset.bonus) zustandO.bonus[e.target.dataset.bonus] = Number(e.target.value) || 0;
    zeichne();
  };
}

// Vorschau vor dem Anlegen: was getauscht wird, alles einzeln abwählbar, erst dann bestätigen.
function vorschau(b, zustand, char, knopf) {
  document.querySelector('#ovorschau')?.remove();
  const cid = char.characterId;
  const jetzt = sammle(zustand.profil).filter((x) => x.ort === cid && x.angelegt);
  const bd = zustandO.build;
  const z = zuteilung(b);
  const anz = new Map(); for (const m of z.values()) { const n = m?.n || m?.name; if (n) anz.set(n, (anz.get(n) || 0) + 1); }
  const modText = [...anz].map(([n, c]) => `${c}× ${n}`);
  const box = document.createElement('div'); box.id = 'ovorschau'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
  const zeile = (it) => { const alt = jetzt.find((x) => x.d.b === it.d.b); const gleich = alt?.id === it.id; return `<label class="ov-teil ${gleich ? 'gleich' : ''}"><input type="checkbox" data-teil="${it.id}" ${gleich ? 'disabled' : 'checked'}><i style="background-image:url(https://www.bungie.net${alt?.d.i || ''})" title="${esc(alt?.d.n || 'empty')}"></i><span class="ov-pfeil">→</span><i style="background-image:url(https://www.bungie.net${it.d.i})"></i><span><b>${esc(it.d.n)}</b><small>${gleich ? 'already equipped' : `replaces ${esc(alt?.d.n || 'nothing')}${it.ort !== cid ? ` · comes from ${it.ort === 'tresor' ? 'the vault' : it.ort.startsWith('post:') ? 'the postmaster' : 'another character'}` : ''}`}</small></span></label>`; };
  box.innerHTML = `<div class="wk-box ov-box"><h2>Check before equipping</h2><p class="leer klein">Nothing happens until you confirm. Untick what should stay as it is.</p>
    <h3>Armor on ${KLASSE[zustandO.klasse]}</h3>${b.items.map(zeile).join('')}
    <label class="ov-opt"><input type="checkbox" data-o="mods" checked> Set stat mods${modText.length ? ` (${esc(modText.join(', '))})` : ''}</label>
    ${bd ? `<h3>Build “${esc(bd.name)}”</h3>
      <label class="ov-opt"><input type="checkbox" data-o="waffen" checked> Weapons of the build (${esc([...(bd.exotics || []), ...((bd.legendaries || []).map((l) => l[0]))].filter(Boolean).join(', ') || 'none listed')})</label>
      <label class="ov-opt"><input type="checkbox" data-o="buildmods" checked> Build mods (non-build mods on these pieces are removed first)</label>
      <label class="ov-opt"><input type="checkbox" data-o="sub" checked> Subclass ${esc(bd.subclass || '')}: ${esc([...(bd.faehigkeiten || []), ...(bd.aspekte || []), ...(bd.fragmente || [])].join(', '))}</label>
      <label class="ov-opt"><input type="checkbox" data-o="artefakt" checked> Artifact perks</label>
      ${Number(zustandO.slot ?? -1) >= 0 ? `<label class="ov-opt"><input type="checkbox" data-o="slot" checked> Save as in-game loadout ${Number(zustandO.slot) + 1}${zustandO.leeren ? ' (slot is cleared first)' : ''}</label>` : ''}` : ''}
    <div class="konto-knoepfe"><button data-ov="nein">Cancel</button><button class="haupt-knopf" data-ov="ja">Equip selected</button></div></div>`;
  document.body.append(box);
  box.querySelector('[data-ov="ja"]').focus();
  box.onclick = async (e) => {
    if (e.target === box || e.target.closest('[data-ov="nein"]')) { box.remove(); return; }
    if (!e.target.closest('[data-ov="ja"]')) return;
    const teile = new Set([...box.querySelectorAll('[data-teil]:checked')].map((x) => x.dataset.teil));
    const o = Object.fromEntries([...box.querySelectorAll('[data-o]')].map((x) => [x.dataset.o, x.checked]));
    box.remove();
    await ausruesten({ ...b, items: b.items.filter((it) => teile.has(it.id) || jetzt.some((j) => j.id === it.id)) }, zustand, char, knopf, { mods: true, waffen: true, buildmods: true, sub: true, artefakt: true, slot: true, ...o, teile });
  };
  box.onkeydown = (e) => { if (e.key === 'Escape') box.remove(); };
}

async function ausruesten(b, zustand, char, knopf, opt = {}) {
  const k = zustand.konto;
  const cid = char.characterId;
  knopf.disabled = true;
  try {
    if (!b.items.length && !zustandO.build) { knopf.disabled = false; return; }
    for (const it of b.items) {
      if (it.ort === cid) continue;
      meldung(`Moving ${it.d.n}…`);
      let ort = it.ort;
      if (ort.startsWith('post:')) { ort = ort.slice(5); await bungie.abholen(k, it, ort); }
      if (ort !== cid) {
        if (ort !== 'tresor') { if (it.angelegt) await ersatzAnlegen(zustand, it); await bungie.verschiebe(k, it, ort, true); }
        await zumCharakter(zustand, it, cid, new Set(b.items.map((x) => x.id)));
      }
      merkeAenderung(it.id, { ort: cid, angelegt: false });
    }
    if (b.items.length) await bungie.ausruestenAlle(k, b.items.map((i) => i.id), cid);
    // Mods stecken: Stat-Mods in den allgemeinen Sockel, beim Build zusätzlich alle Build-Mods (Firepower, Siphons, Surges …)
    // in die Slot-Sockel, mit Energie-Grenze. Was nicht zum Build gehört, wird beim Build vorher geleert, damit Energie frei ist.
    const bdM = opt.buildmods === false ? null : zustandO.build;
    const z = zuteilung(b);
    const el = bdM?.element || '';
    const wunsch = bdM ? (bdM.mods?.length ? bdM.mods : modplan.vorschlag(el, bdM.stats || [], [bdM.subclass, ...(bdM.faehigkeiten || [])].join(' '))) : [];
    const { plan, uebrig } = modplan.plane(b.items, z, wunsch, el);
    const modFehler = [];
    for (const { teil, sockel, soll } of (opt.mods === false && !bdM ? [] : plan)) {
      if (opt.mods === false) for (const [i, m] of [...soll]) if (/Mod$/.test(m.n || m.name || '') && !(bdM?.mods || []).includes(m.n || m.name)) soll.delete(i);
      if (bdM) {
        for (const so of sockel) {
          const ziel = soll.get(so.i);
          const zielHash = ziel ? ziel.hash || ziel.plug : null;
          if (zielHash === so.jetzt || defs.items[so.jetzt]?.n?.startsWith('Empty')) continue;
          const leer = modplan.leerPlug(so.pc);
          if (leer) await bungie.plugSetzen(k, teil, cid, so.i, leer.hash).catch(() => {});
        }
      }
      for (const [i, m] of soll) {
        const h = m.hash || m.plug;
        if (teil.sockel[i] === h) continue;
        meldung(`${m.n || m.name} on ${teil.d.n}…`);
        try { await bungie.plugSetzen(k, teil, cid, i, h); } catch (e) { modFehler.push(`${m.n || m.name} on ${teil.d.n}: ${e.message}`); }
      }
    }
    if (bdM && uebrig.length) modFehler.push(`No room or energy for: ${uebrig.join(', ')}`);
    for (const it of b.items) merkeAenderung(it.id, { ort: cid, angelegt: true });
    const bd = zustandO.build;
    const probleme = [...modFehler];
    if (bd) await baueBuild(bd, zustand, cid, probleme, opt);
    const slot = bd && opt.slot !== false ? Number(zustandO.slot ?? -1) : -1;
    if (slot >= 0) {
      const lo = zustand.profil.characterLoadouts?.data?.[cid]?.loadouts?.[slot] || {};
      const erst = (o) => Number(Object.keys(o || {}).find((h) => o[h]) || 0);
      meldung(`Saving to in-game slot ${slot + 1}…`);
      if (zustandO.leeren) await bungie.post('/Destiny2/Actions/Loadouts/ClearLoadout/', { loadoutIndex: slot, characterId: cid, membershipType: k.membershipType }).catch((e) => probleme.push(e.message));
      await bungie.post('/Destiny2/Actions/Loadouts/SnapshotLoadout/', { loadoutIndex: slot, characterId: cid, membershipType: k.membershipType, nameHash: lo.nameHash || erst(defs.lo?.n), iconHash: lo.iconHash || erst(defs.lo?.i), colorHash: lo.colorHash || erst(defs.lo?.f) }).catch((e) => probleme.push(e.message));
    }
    meldung(probleme.length ? `Done, with ${probleme.length} problem(s): ${probleme.slice(0, 2).join(' · ')}` : bd ? `${bd.name} equipped${slot >= 0 ? ` and saved to slot ${slot + 1}` : ''}.` : 'Armor set equipped.', probleme.length > 0);
  } catch (e) { meldung(e.message, true); }
  knopf.disabled = false;
}

// Exotic-Waffe, Subclass, Super, Fähigkeiten, Aspekte und Fragmente des Builds anlegen.
async function baueBuild(bd, zustand, cid, probleme, opt = {}) {
  const k = zustand.konto;
  const profil = zustand.profil;
  // Exotic-Waffe des Builds und je Slot die erste empfohlene Legendary, die du besitzt.
  const liste = sammle(profil);
  const exoW = (bd.exotics || []).map((n) => liste.find((x) => x.d.t === 3 && x.d.n === n)).filter(Boolean)[0];
  const ziele = exoW && opt.waffen !== false ? [exoW] : [];
  for (const slot of opt.waffen === false ? [] : bd.legendaries || []) {
    const w = slot.map((n) => liste.filter((x) => x.d.t === 3 && x.d.n === n).sort((a, b) => (/god/.test(b.m?.roll || '') - /god/.test(a.m?.roll || '')) || b.power - a.power)[0]).find(Boolean);
    if (w && !ziele.some((z) => z.d.b === w.d.b)) ziele.push(w);
  }
  for (const w of ziele) {
    const name = w.d.n;
    try {
      meldung(`Equipping ${name}…`);
      let ort = w.ort;
      if (ort.startsWith('post:')) { ort = ort.slice(5); await bungie.abholen(k, w, ort); }
      if (ort !== cid) { if (ort !== 'tresor') { if (w.angelegt) await ersatzAnlegen(zustand, w); await bungie.verschiebe(k, w, ort, true); } await zumCharakter(zustand, w, cid, new Set(ziele.map((x) => x.id))); }
      if (w.d.q === 6) await bungie.ausruesten(k, w, cid);
      merkeAenderung(w.id, { ort: cid, angelegt: true });
    } catch (e) { probleme.push(e.message); }
  }
  // Legendaries zusammen ausrüsten (nach der Exotic, damit kein zweites Exotic stört).
  const leg = ziele.filter((w) => w.d.q !== 6).map((w) => w.id);
  if (leg.length) await bungie.ausruestenAlle(k, leg, cid).catch((e) => probleme.push(`Weapons: ${e.message}`));
  if (!bd.subclass || opt.sub === false) { if (opt.artefakt !== false) await artefakt(bd, zustand, cid, probleme); return; }
  const alle = [...(profil.characterInventories?.data?.[cid]?.items || []), ...(profil.characterEquipment?.data?.[cid]?.items || [])];
  const sub = alle.find((i) => defs.items[i.itemHash]?.t === 16 && defs.items[i.itemHash].n === bd.subclass);
  if (!sub) { probleme.push(`Subclass ${bd.subclass} not found on this character.`); return; }
  try {
    meldung(`Switching to ${bd.subclass}…`);
    await bungie.ausruesten(k, { id: sub.itemInstanceId }, cid);
    const r = await bungie.item(k, sub.itemInstanceId);
    const sockel = r.sockets?.data?.sockets || [];
    const typVon = (pc) => (pc || '').split('.').pop();
    const kl = ['titan', 'hunter', 'warlock'][defs.items[sub.itemHash].c];
    const el = Object.entries(SUBCLASS[kl] || {}).find(([, n]) => n === bd.subclass)?.[0];
    const belegt = new Set();
    const wunsch = new Set([...bd.faehigkeiten, ...bd.aspekte, ...bd.fragmente]);
    // Reihenfolge wichtig: Aspekte bestimmen, wie viele Fragment-Plätze frei sind.
    for (const name of [...bd.faehigkeiten, ...bd.aspekte, ...bd.fragmente]) {
      const kandidaten = Object.entries(defs.items).filter(([, d]) => d.t === 19 && d.n === name && new RegExp(`^(${kl}|shared)\\.${el}\\.`).test(d.pc || ''));
      if (!kandidaten.length) { probleme.push(`${name}: not found for ${bd.subclass}.`); continue; }
      const [ph, pd] = kandidaten[0];
      const typ = typVon(pd.pc);
      // Schon gesteckt? Dann diesen Sockel behalten, sonst würde Bungie das doppelte Teil ablehnen.
      const schon = sockel.findIndex((so, n) => !belegt.has(n) && kandidaten.some(([h]) => Number(h) === so.plugHash));
      const i = schon >= 0 ? schon : sockel.findIndex((so, n) => !belegt.has(n) && typVon(defs.items[so.plugHash]?.pc) === typ && !wunsch.has(defs.items[so.plugHash]?.n));
      if (i < 0) { probleme.push(`${name}: no free ${typ} slot.`); continue; }
      belegt.add(i);
      if (schon >= 0) continue;
      meldung(`Setting ${name}…`);
      try { await bungie.plugSetzen(k, { id: sub.itemInstanceId }, cid, i, Number(ph)); } catch (e) { probleme.push(`${name}: ${e.message}`); }
    }
  } catch (e) { probleme.push(e.message); }
  if (opt.artefakt !== false) await artefakt(bd, zustand, cid, probleme);
}

// Artefakt-Perks: gewünschte aus dem Build, sonst die am besten passenden aus deinem aktuellen Artefakt.
async function artefakt(bd, zustand, cid, probleme) {
  const k = zustand.konto;
  const p = zustand.profil;
  const art = [...(p.characterEquipment?.data?.[cid]?.items || [])].find((i) => i.bucketHash === 1506418338);
  if (!art) return;
  try {
    const r = await bungie.item(k, art.itemInstanceId);
    const sockel = (r.sockets?.data?.sockets || []).map((s, i) => ({ i, jetzt: s.plugHash })).filter((s) => defs.items[s.jetzt]?.pc === 'artifact_perks');
    const sets = { ...(p.profilePlugSets?.data?.plugs || {}) };
    for (const c of Object.values(p.characterPlugSets?.data || {})) Object.assign(sets, c.plugs || {});
    const artSets = Object.entries(sets).filter(([, l]) => l.some((x) => defs.items[x.plugItemHash]?.pc === 'artifact_perks'));
    // Gruppe des aktuellen Artefakts: die Plug-Sets, in denen die gerade gesteckten Perks vorkommen.
    const gruppen = new Map();
    for (const [h, l] of artSets) { const g = h.slice(0, -1); const n = sockel.filter((so) => l.some((x) => x.plugItemHash === so.jetzt)).length; gruppen.set(g, (gruppen.get(g) || 0) + n); }
    const gruppe = [...gruppen].sort((a, b) => b[1] - a[1])[0]?.[0];
    const meine = artSets.filter(([h]) => h.slice(0, -1) === gruppe).map(([, l]) => l.filter((x) => x.canInsert !== false).map((x) => x.plugItemHash));
    const text = [bd.subclass, bd.element, ...(bd.faehigkeiten || []), ...(bd.aspekte || []), ...(bd.exotics || []), ...(bd.waffen || []), ...(bd.stats || [])].join(' ').toLowerCase();
    const worte = new Set(text.match(/[a-z]{4,}/g) || []);
    const wert = (h) => { const d = defs.items[h]; if (!d || /^Empty/.test(d.n)) return -1; if ((bd.artefaktPerks || []).includes(d.n)) return 100; let s = 0; for (const w of `${d.n} ${d.d || ''}`.toLowerCase().match(/[a-z]{4,}/g) || []) if (worte.has(w)) s += 1; return s; };
    const benutzt = new Set();
    for (const so of sockel) {
      const set = meine.find((l) => l.includes(so.jetzt)) || [];
      const best = set.filter((h) => !benutzt.has(h)).sort((a, b) => wert(b) - wert(a))[0];
      const ziel = best && wert(best) > Math.max(0, wert(so.jetzt)) ? best : so.jetzt;
      benutzt.add(ziel);
      if (ziel === so.jetzt) continue;
      meldung(`Artifact: ${defs.items[ziel].n}…`);
      try { await bungie.plugSetzen(k, { id: art.itemInstanceId }, cid, so.i, ziel); } catch (e) { probleme.push(`Artifact ${defs.items[ziel].n}: ${e.message}`); }
    }
  } catch (e) { probleme.push(`Artifact: ${e.message}`); }
}
