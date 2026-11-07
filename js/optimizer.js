// Rüstungs-Optimizer mit Live-Leisten wie d2armorpicker: Klick setzt Mindestwert (5er-Schritte),
// die Leiste zeigt, was mit den anderen Mindestwerten noch erreichbar ist.
import * as bungie from './bungie.js';
import { defs } from './defs.js';
import { sammle, merkeAenderung, ARMOR_STATS } from './vault.js';
import { meldung } from './app.js';

const BILD = 'https://www.bungie.net';
const KLASSE = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
const SLOTS = [3448274439, 3551918588, 14239492, 20886954, 1585787867];
const SKALA = 200;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const lies = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const speichere = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

let zustandO = lies('d2a.opt', { klasse: null, ziele: {}, bonus: {}, exotic: 0, mods: true });
let ergebnisse = null;

const statName = (h) => defs.stats?.[h]?.n;
const istStatMod = (p) => {
  const d = defs.items[p];
  return Boolean(d && d.t === 19 && /^enhancements\./.test(d.pc || '') && d.s?.length === 1 && d.s[0][1] > 0 && / Mod$/.test(d.n || '') && !/\//.test(d.n));
};
let modKarte = null;
function statMods() {
  if (modKarte) return modKarte;
  modKarte = {};
  for (const [h, d] of Object.entries(defs.items)) {
    if (!istStatMod(h)) continue;
    const n = statName(d.s[0][0]);
    if (ARMOR_STATS.includes(n) && d.n === `${n} Mod` && (!modKarte[n] || modKarte[n].wert < d.s[0][1])) modKarte[n] = { plug: Number(h), wert: d.s[0][1], name: d.n, icon: d.i };
  }
  return modKarte;
}

function ruestung(profil, klasse) {
  return sammle(profil).filter((x) => x.st && SLOTS.includes(x.d.b) && (x.d.c === klasse || x.d.c === 3)).map((x) => {
    const basis = { ...x.st };
    let modSockel = -1;
    x.sockel.forEach((p, n) => {
      if (!istStatMod(p)) return;
      for (const [h, v] of defs.items[p].s) { const s = statName(h); if (s in basis) basis[s] -= v; }
      if (modSockel < 0) modSockel = n;
    });
    if (modSockel < 0) modSockel = x.sockel.findIndex((p) => /^enhancements\./.test(defs.items[p]?.pc || '') && /^Empty/.test(defs.items[p]?.n || ''));
    return { ...x, basis, modSockel, exo: x.d.q === 6, set: x.d.e ? defs.sets?.[x.d.e] : null };
  });
}

function gruppen(liste, wunsch, proFach) {
  const ziel = ARMOR_STATS.map((n) => wunsch.ziele[n] || 0);
  const wert = (i) => (wunsch.mods ? i.basis : i.st);
  return SLOTS.map((b) => {
    let w = liste.filter((i) => i.d.b === b);
    if (wunsch.exotic) { const exoSlot = liste.find((i) => i.hash === wunsch.exotic)?.d.b; w = b === exoSlot ? w.filter((i) => i.hash === wunsch.exotic) : w.filter((i) => !i.exo); }
    const nutzen = (i) => ARMOR_STATS.reduce((a, n, k) => a + (wert(i)[n] || 0) * (ziel[k] ? 2 : 1), 0);
    const wahl = new Set([...w].sort((a, b2) => nutzen(b2) - nutzen(a)).slice(0, proFach - ARMOR_STATS.length));
    for (const n of ARMOR_STATS) { const best = [...w].sort((a, b2) => (wert(b2)[n] || 0) - (wert(a)[n] || 0))[0]; if (best) wahl.add(best); }
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

function rechne(liste, wunsch) {
  const mods = statMods();
  const modWert = ARMOR_STATS.map((n) => (wunsch.mods ? mods[n]?.wert || 0 : 0));
  const bonus = ARMOR_STATS.map((n) => Number(wunsch.bonus[n]) || 0);
  const ziel = ARMOR_STATS.map((n) => wunsch.ziele[n] || 0);
  const g = gruppen(liste, wunsch, 14);
  if (g.some((x) => !x.length)) return { max: ARMOR_STATS.map(() => 0), anzahl: 0, beste: [] };
  const max = ARMOR_STATS.map(() => 0);
  let anzahl = 0;
  const beste = [];
  durchlaufe(g, (summe, frei, weg) => {
    const s = summe.map((v, n) => v + bonus[n]);
    const noetig = s.map((v, n) => (v >= ziel[n] ? 0 : modWert[n] ? Math.ceil((ziel[n] - v) / modWert[n]) : Infinity));
    const alle = noetig.reduce((a, b) => a + b, 0);
    for (let n = 0; n < 6; n++) {
      const andere = alle - noetig[n];
      if (andere <= frei) max[n] = Math.max(max[n], s[n] + (frei - andere) * modWert[n]);
    }
    if (alle > frei) return;
    anzahl += 1;
    // Rest-Mods auf den Stat mit dem größten Abstand zur nächsten 10.
    const plus = noetig.map((k, n) => k * modWert[n]);
    let rest = frei - alle;
    const wertung = s.reduce((a, v, n) => a + v + plus[n], 0) + rest * Math.max(...modWert);
    if (beste.length === 8 && wertung <= beste[7].wertung) return;
    const extra = ARMOR_STATS.map(() => 0);
    while (rest > 0) { let b = -1; let bw = -1; for (let n = 0; n < 6; n++) if (modWert[n] && ziel[n] > bw) { bw = ziel[n]; b = n; } if (b < 0) break; extra[b] += modWert[b]; rest -= 1; }
    beste.push({ wertung, items: weg.map((x) => x.i), werte: s.map((v, n) => v + plus[n] + extra[n]), modsJeStat: plus.map((v, n) => (v + extra[n]) / (modWert[n] || 1)) });
    beste.sort((a, b) => b.wertung - a.wertung);
    if (beste.length > 8) beste.pop();
  });
  return { max, anzahl, beste };
}

function setBoni(items) {
  const z = new Map();
  for (const i of items) if (i.set) z.set(i.set, (z.get(i.set) || 0) + 1);
  return [...z].flatMap(([s, n]) => s.p.filter((p) => p.c <= n).map((p) => ({ ...p, set: s.n })));
}

export function zeigeOptimizer(haupt, zustand) {
  const chars = Object.values(zustand.profil.characters?.data || {}).sort((a, b) => new Date(b.dateLastPlayed) - new Date(a.dateLastPlayed));
  if (zustandO.klasse === null || !chars.some((c) => c.classType === zustandO.klasse)) zustandO.klasse = chars[0].classType;
  const zeichne = () => {
    const liste = ruestung(zustand.profil, zustandO.klasse);
    const exotics = [...new Map(liste.filter((i) => i.exo).map((i) => [i.hash, i])).values()].sort((a, b) => a.d.n.localeCompare(b.d.n));
    if (zustandO.exotic && !exotics.some((e) => e.hash === zustandO.exotic)) zustandO.exotic = 0;
    const r = rechne(liste, zustandO);
    ergebnisse = r.beste;
    speichere('d2a.opt', zustandO);
    const mods = statMods();
    haupt.innerHTML = `<div class="kopf"><h1>Optimizer</h1><span class="platz"></span><div class="chips">${chars.map((c) => `<button class="chip" data-kl="${c.classType}" aria-pressed="${c.classType === zustandO.klasse}">${KLASSE[c.classType]}</button>`).join('')}</div></div>
    <div class="optgrid"><section class="karte"><div class="optleiste">
      <label>Exotic <select id="exo"><option value="0">Any</option>${exotics.map((e) => `<option value="${e.hash}" ${e.hash === zustandO.exotic ? 'selected' : ''}>${esc(e.d.n)}</option>`).join('')}</select></label>
      <label class="haken"><input type="checkbox" id="mitMods" ${zustandO.mods ? 'checked' : ''}> Use stat mods</label>
      <span class="anzahl"><b>${r.anzahl.toLocaleString()}</b> combinations</span><button class="chip" id="reset">Reset</button></div>
      ${ARMOR_STATS.map((n, k) => {
        const z = zustandO.ziele[n] || 0;
        return `<div class="sbar"><span class="sname">${n}</span>
          <div class="sleiste" data-s="${n}" title="Click to set a minimum">
            <i class="smax" style="width:${(r.max[k] / SKALA) * 100}%"></i><i class="sziel" style="width:${(z / SKALA) * 100}%"></i>
            ${[50, 100, 150].map((m) => `<i class="smark" style="left:${(m / SKALA) * 100}%"></i>`).join('')}</div>
          <span class="swert"><b>${z}</b> / ${r.max[k]}</span>
          <label class="sbonus" title="Bonus from subclass fragments etc.">+<input type="number" step="5" data-bonus="${n}" value="${zustandO.bonus[n] || 0}"></label></div>`;
      }).join('')}
      <p class="leer klein">Gold = your minimum, violet = still reachable. Stat mods: ${ARMOR_STATS.map((n) => mods[n] ? `${n} +${mods[n].wert}` : '').filter(Boolean).join(', ') || 'none found'}.</p></section>
    <section><h2>Best sets</h2>${r.beste.map((b, k) => `<article class="kombi">
      <div class="kitems">${b.items.map((i) => `<i class="ic ${i.exo ? 'exotic' : ''}" title="${esc(i.d.n)}" style="background-image:url(${BILD}${i.d.i})"><i class="ort ${i.ort === 'tresor' ? 'tresor' : 'char'}"></i></i>`).join('')}</div>
      <div class="kwerte">${ARMOR_STATS.map((n, j) => `<span><small>${n}</small><b>${b.werte[j]}</b></span>`).join('')}</div>
      ${b.modsJeStat.some(Boolean) ? `<small class="kmods">Mods: ${ARMOR_STATS.map((n, j) => (b.modsJeStat[j] ? `${b.modsJeStat[j]}× ${n}` : '')).filter(Boolean).join(', ')}</small>` : ''}
      ${setBoni(b.items).map((p) => `<small class="kset">${esc(p.set)} (${p.c}): ${esc(p.n)}</small>`).join('')}
      <button class="haupt-knopf" data-equip="${k}">Equip on ${KLASSE[zustandO.klasse]}</button></article>`).join('') || '<p class="leer">No combination reaches these minimums. Lower one of them.</p>'}</section></div>`;
  };
  zeichne();

  haupt.onclick = async (e) => {
    const kl = e.target.closest('[data-kl]');
    if (kl) { zustandO.klasse = Number(kl.dataset.kl); return zeichne(); }
    if (e.target.id === 'reset') { zustandO.ziele = {}; return zeichne(); }
    const leiste = e.target.closest('.sleiste');
    if (leiste) {
      const r = leiste.getBoundingClientRect();
      const wert = Math.round((((e.clientX - r.left) / r.width) * SKALA) / 5) * 5;
      zustandO.ziele[leiste.dataset.s] = Math.max(0, Math.min(SKALA, wert));
      return zeichne();
    }
    const eq = e.target.closest('[data-equip]');
    if (eq) await ausruesten(ergebnisse[Number(eq.dataset.equip)], zustand, chars.find((c) => c.classType === zustandO.klasse), eq);
  };
  haupt.onchange = (e) => {
    if (e.target.id === 'exo') zustandO.exotic = Number(e.target.value);
    if (e.target.id === 'mitMods') zustandO.mods = e.target.checked;
    if (e.target.dataset.bonus) zustandO.bonus[e.target.dataset.bonus] = Number(e.target.value) || 0;
    zeichne();
  };
}

async function ausruesten(b, zustand, char, knopf) {
  const k = zustand.konto;
  const cid = char.characterId;
  knopf.disabled = true;
  try {
    for (const it of b.items) {
      if (it.ort === cid) continue;
      meldung(`Moving ${it.d.n}…`);
      let ort = it.ort;
      if (ort.startsWith('post:')) { ort = ort.slice(5); await bungie.abholen(k, it, ort); }
      if (ort !== cid) {
        if (ort !== 'tresor') { if (it.angelegt) throw new Error(`${it.d.n} is equipped on another character.`); await bungie.verschiebe(k, it, ort, true); }
        await bungie.verschiebe(k, it, cid, false);
      }
      merkeAenderung(it.id, { ort: cid, angelegt: false });
    }
    await bungie.ausruestenAlle(k, b.items.map((i) => i.id), cid);
    // Stat-Mods stecken.
    const mods = statMods();
    const offen = ARMOR_STATS.flatMap((n, j) => Array(b.modsJeStat[j] || 0).fill(n));
    for (const it of b.items) {
      if (it.modSockel < 0 || !offen.length) continue;
      const n = offen.shift();
      try { await bungie.plugSetzen(k, it, cid, it.modSockel, mods[n].plug); } catch (e) { meldung(`${mods[n].name} on ${it.d.n}: ${e.message}`, true); }
    }
    for (const it of b.items) merkeAenderung(it.id, { ort: cid, angelegt: true });
    meldung('Armor set equipped.');
  } catch (e) { meldung(e.message, true); }
  knopf.disabled = false;
}
