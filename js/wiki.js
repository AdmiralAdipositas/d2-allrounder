// Wiki: Suche mit kurzer, eindeutiger Antwort (aufklappbar für mehr) und Stöbern nach Kategorien.
// Daten: Bungies Spieldaten (Quellen, Sets, Exotics, Aktivitäten), Farm-Orte und Raid-Challenges der App.
import { defs } from './defs.js';
import { sammle } from './vault.js';
import { CHALLENGES } from './challenges.js';
import { empfehlung } from './rolls.js';
import { quelle } from './quellen.js';
import * as bungie from './bungie.js';

const BILD = 'https://www.bungie.net';
const KLASSE = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock', 3: 'Any class' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const ORTE = ['EDZ', 'European Dead Zone', 'Cosmodrome', 'Nessus', 'Dreaming City', 'Moon', 'Europa', 'Throne World', 'Neomuna', 'Pale Heart', 'Kepler', 'Tangled Shore', 'Mars', 'Mercury', 'Titan', 'Io', 'Savathûn', 'Eternity', 'Tower', 'Leviathan'];
const WEICH = new Set(['set', 'sets', 'armor', 'where', 'get', 'drop', 'drops', 'from', 'how', 'the', 'to', 'farm', 'find', 'is', 'a', 'of', 'in', 'what', 'does', 'gear']);
const KATEGORIEN = [['ort', 'Destinations', '🪐'], ['set', 'Armor sets', '🛡'], ['exo', 'Exotics', '⭐'], ['akt', 'Raids & Dungeons', '⚔'], ['chal', 'Raid challenges', '🏆'], ['seal', 'Seals & triumphs', '🎖'], ['quelle', 'Collections by source', '📚']];

let eintraege = null;
let setsFarm = {};
const offen = new Set();
let ansicht = { suche: '', kat: null };
export function setzeWikiSuche(q) { ansicht = { suche: q, kat: null }; }

async function baue(zustand) {
  if (eintraege) return eintraege;
  setsFarm = (await fetch('data/sets.json').then((r) => r.json()).catch(() => ({ sets: {} }))).sets;
  const besitz = new Map();
  for (const x of sammle(zustand.profil)) besitz.set(x.d.n, (besitz.get(x.d.n) || 0) + 1);
  const liste = [];
  const items = Object.entries(defs.items).filter(([, d]) => [2, 3].includes(d.t) && d.i);
  const quelleVon = (d, h) => quelle(h, d)?.text || '';
  const vonText = (d, h) => { const q = quelle(h, d); return q ? ` <span class="wm">(${q.von})</span>` : ''; };
  const farmVon = (name) => Object.entries(setsFarm).find(([n]) => name.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(name.toLowerCase()))?.[1];

  // Rüstungssets
  for (const [h, s] of Object.entries(defs.sets || {})) {
    if (!s.n) continue;
    const teile = items.filter(([, d]) => d.e === Number(h));
    if (!teile.length) continue;
    const farm = farmVon(s.n);
    const quellen = [...new Set(teile.map(([th, d]) => quelleVon(d, th)).filter(Boolean))];
    const hat = teile.reduce((a, [, d]) => a + (besitz.get(d.n) || 0), 0);
    liste.push({ typ: 'set', titel: s.n, icon: teile[0][1].i, tags: `set armor ${farm?.ort || ''} ${quellen.join(' ')}`,
      kurz: farm ? `${farm.farm}${farm.schnell ? ' · fast farm' : ''}.` : quellen[0] ? `Drops from: ${quellen[0]}.` : 'No confirmed drop source yet – see light.gg below.',
      mehr: `${(s.p || []).map((p) => `<p><b>${p.c}-piece: ${esc(p.n)}</b> – ${esc(p.d)}</p>`).join('')}
        ${quellen.length > 1 ? `<p class="wm">Also from: ${esc(quellen.slice(1).join(' · '))}</p>` : ''}
        <p class="wm">You own ${hat} piece${hat === 1 ? '' : 's'}. Sources: ${farm ? 'farm guide (timesaver.gg), ' : ''}Bungie collections, DIM community data.</p>
        <p><a href="https://www.light.gg/db/search/?q=${encodeURIComponent(s.n)}" target="_blank" rel="noopener">light.gg ↗</a></p>
        <div class="wteile">${teile.slice(0, 15).map(([, d]) => `<span title="${esc(KLASSE[d.c])} · ${esc(d.k)}"><i style="background-image:url(${BILD}${d.i})"></i>${esc(d.n)}${besitz.get(d.n) ? ' ✓' : ''}</span>`).join('')}</div>` });
  }
  // Orte
  for (const ort of ORTE) {
    const re = new RegExp(`\\b${ort}\\b`, 'i');
    const sets = Object.entries(setsFarm).filter(([, f]) => re.test(f.ort) || re.test(f.farm));
    const waffen = items.filter(([wh, d]) => d.t === 3 && re.test(quelleVon(d, wh)));
    if (!sets.length && !waffen.length) continue;
    liste.push({ typ: 'ort', titel: ort, icon: '', tags: `destination planet ${ort}`,
      kurz: `${sets.length ? `Armor: ${sets.map(([n]) => n).join(', ')}. ` : ''}${waffen.length ? `${waffen.length} weapons drop here.` : ''}`,
      mehr: `${sets.map(([n, f]) => `<p><b>${esc(n)}</b> – ${esc(f.farm)}${f.schnell ? ' · fast farm' : ''}</p>`).join('')}
        ${waffen.length ? `<div class="wteile">${[...new Map(waffen.map(([, d]) => [d.n, d])).values()].slice(0, 30).map((d) => `<span><i style="background-image:url(${BILD}${d.i})"></i>${esc(d.n)}${besitz.get(d.n) ? ' ✓' : ''}</span>`).join('')}</div>` : ''}` });
  }
  // Exotics und Waffen
  const gesehen = new Set();
  for (const [h, d] of items) {
    if (gesehen.has(d.n)) continue;
    if (d.q === 6) {
      gesehen.add(d.n);
      liste.push({ typ: 'exo', titel: d.n, icon: d.i, tags: `exotic ${d.k} ${KLASSE[d.c]} ${d.xp || ''} ${d.xd || ''}`,
        kurz: `${KLASSE[d.c] !== 'Any class' ? `${KLASSE[d.c]} ` : ''}${d.k}. ${quelleVon(d, h) ? `Get it: ${quelleVon(d, h)}.` : 'Get it from exotic engrams, Xûr, or the Monument to Lost Lights in the Tower.'}`,
        mehr: `${d.xd ? `<p><b>${esc(d.xp || 'Exotic perk')}</b> – ${esc(d.xd)}</p>` : ''}<p class="wm">Source:${vonText(d, h) || ' general exotic sources'}. </p><p class="wm">${besitz.get(d.n) ? `You own ${besitz.get(d.n)}.` : 'Not in your inventory.'}</p><p><a href="https://www.light.gg/db/items/${h}/" target="_blank" rel="noopener">light.gg ↗</a></p>` });
    } else if (d.t === 3 && d.q === 5 && quelleVon(d, h)) {
      gesehen.add(d.n);
      const r = empfehlung(h);
      liste.push({ typ: 'waffe', titel: d.n, icon: d.i, tags: `weapon ${d.k} ${quelleVon(d, h)}`, quelle: quelleVon(d, h),
        kurz: `${d.k}. Get it: ${quelleVon(d, h)}.`,
        mehr: `<p class="wm">Source:${vonText(d, h)}.</p><p class="wm">${besitz.get(d.n) ? `You own ${besitz.get(d.n)} cop${besitz.get(d.n) === 1 ? 'y' : 'ies'}.` : 'Not in your inventory.'}${r?.ge?.length ? ' Community PvE god roll known.' : ''}${r?.gv?.length ? ' PvP god roll known.' : ''}</p><p><a href="https://www.light.gg/db/items/${h}/" target="_blank" rel="noopener">light.gg ↗</a></p>` });
    }
  }
  // Raids und Dungeons
  const akt = new Map();
  for (const a of Object.values(defs.akt || {})) { if (a.g === 'Portal') continue; const n = a.n.split(':')[0].trim(); if (!akt.has(n)) akt.set(n, a); }
  for (const [n, a] of akt) {
    const loot = [...new Map(items.filter(([lh, d]) => quelleVon(d, lh).toLowerCase().includes(n.toLowerCase())).map(([, d]) => [d.n, d])).values()];
    liste.push({ typ: 'akt', titel: n, icon: a.i && !/missing/.test(a.i) ? a.i : '', tags: `${a.g} raid dungeon activity`,
      kurz: `${a.g === 'Raids' ? 'Raid' : 'Dungeon'}. ${loot.length ? `${loot.length} items drop here.` : ''}`,
      mehr: `${a.d ? `<p>${esc(a.d)}</p>` : ''}${loot.length ? `<div class="wteile">${loot.slice(0, 30).map((d) => `<span><i style="background-image:url(${BILD}${d.i})"></i>${esc(d.n)}${besitz.get(d.n) ? ' ✓' : ''}</span>`).join('')}</div>` : ''}` });
  }
  for (const [n, [enc, text]] of Object.entries(CHALLENGES)) liste.push({ typ: 'chal', titel: n, icon: '', tags: `challenge ${enc}`, kurz: `${enc}: ${text}`, mehr: '' });
  // Sammlungen nach Quelle
  const proQuelle = new Map();
  for (const e of liste.filter((x) => x.typ === 'waffe')) proQuelle.set(e.quelle, [...(proQuelle.get(e.quelle) || []), e]);
  for (const [q, ws] of proQuelle) liste.push({ typ: 'quelle', titel: q, icon: '', tags: `source collection ${q}`, kurz: `${ws.length} weapons.`, mehr: `<div class="wteile">${ws.map((w) => `<span><i style="background-image:url(${BILD}${w.icon})"></i>${esc(w.titel)}</span>`).join('')}</div>` });
  // Seals mit Fortschritt (Triumph-Stand vom Konto, einmal geladen).
  let stand = {};
  try {
    const k = zustand.konto;
    const r = await bungie.get(`/Destiny2/${k.membershipType}/Profile/${k.membershipId}/?components=900`);
    stand = { ...(r.profileRecords?.data?.records || {}) };
    for (const c of Object.values(r.characterRecords?.data || {})) for (const [h, v] of Object.entries(c.records || {})) if (!stand[h]) stand[h] = v;
  } catch {}
  const fertig = (h) => { const x = stand[h]; return Boolean(x) && (x.state & 4) === 0; };
  for (const [h, sl] of Object.entries(defs.seal || {})) {
    const done = sl.k.filter(fertig).length;
    const titelDa = fertig(sl.c);
    liste.push({ typ: 'seal', titel: `${sl.n}${sl.t && sl.t !== sl.n ? ` · “${sl.t}”` : ''}`, icon: sl.i, tags: `seal title triumph ${sl.n} ${sl.t} ${sl.d}`,
      kurz: `${titelDa ? 'Title earned ✓' : `${done} / ${sl.k.length} triumphs done`}${sl.d ? ` · ${sl.d.split('. ')[0]}` : ''}`,
      mehr: `<div class="sealbar"><i style="width:${Math.round((done / sl.k.length) * 100)}%"></i></div>${sl.k.map((r) => { const rec = defs.rec?.[r]; const ok = fertig(r); return rec ? `<p class="${ok ? 'sok' : 'soffen'}">${ok ? '✓' : '○'} <b>${esc(rec.n)}</b>${rec.d ? ` – ${esc(rec.d)}` : ''}</p>` : ''; }).join('')}` });
  }
  eintraege = liste;
  return liste;
}

function suche(liste, text) {
  const roh = text.toLowerCase().split(/\s+/).filter(Boolean);
  const hart = roh.filter((w) => !WEICH.has(w));
  const worte = hart.length ? hart : roh;
  const treffer = [];
  for (const e of liste) {
    const t = e.titel.toLowerCase(); const g = `${t} ${e.tags.toLowerCase()}`;
    if (!worte.every((w) => g.includes(w))) continue;
    let s = worte.reduce((a, w) => a + (t.includes(w) ? 3 : 1), 0) + (t === text.toLowerCase() ? 10 : 0);
    if (roh.some((w) => /^sets?$|armor/.test(w)) && e.typ === 'set') s += 4;
    if (e.typ === 'waffe') s -= 1;
    treffer.push({ e, s });
  }
  return treffer.sort((a, b) => b.s - a.s).map((x) => x.e);
}

const ID = (e) => `${e.typ}:${e.titel}`;
const zeile = (e, antwort = false) => {
  const auf = offen.has(ID(e));
  return `<article class="wz ${antwort ? 'antwort' : ''}" data-w="${esc(ID(e))}">
    <div class="wz-kopf">${e.icon ? `<i style="background-image:url(${BILD}${e.icon})"></i>` : ''}<div><small>${esc({ set: 'Armor set', ort: 'Destination', exo: 'Exotic', waffe: 'Weapon', akt: 'Activity', chal: 'Raid challenge', quelle: 'Source', seal: 'Seal' }[e.typ])}</small><b>${esc(e.titel)}</b></div></div>
    <p class="wz-kurz">${esc(e.kurz)}</p>
    ${e.mehr ? (auf ? `<div class="wz-mehr">${e.mehr}</div><button class="fk-klapp" data-wk="${esc(ID(e))}">Less ▴</button>` : `<button class="fk-klapp" data-wk="${esc(ID(e))}">More context ▾</button>`) : ''}</article>`;
};

export async function zeigeWiki(el, zustand) {
  el.innerHTML = '<h1>Wiki</h1><p class="leer">Building the index…</p>';
  const liste = await baue(zustand);
  const zeichne = () => {
    let inhalt;
    if (ansicht.suche) {
      const t = suche(liste, ansicht.suche);
      inhalt = t.length ? `${zeile(t[0], true)}${t.length > 1 ? `<h3 class="wh">More results (${t.length - 1})</h3>${t.slice(1, 40).map((e) => zeile(e)).join('')}` : ''}` : '<p class="leer">Nothing found. Try another word, e.g. a planet, a set or a weapon name.</p>';
    } else if (ansicht.kat) {
      const t = liste.filter((e) => e.typ === ansicht.kat).sort((a, b) => a.titel.localeCompare(b.titel));
      inhalt = `<button class="chip" data-zurueck>← All categories</button><h2 class="wh">${esc(KATEGORIEN.find((k) => k[0] === ansicht.kat)[1])} <small>${t.length}</small></h2>${t.map((e) => zeile(e)).join('')}`;
    } else {
      inhalt = `<div class="wkat">${KATEGORIEN.map(([k, n, ic]) => `<button data-kat="${k}"><span>${ic}</span><b>${n}</b><small>${liste.filter((e) => e.typ === k).length}</small></button>`).join('')}</div>
        <p class="leer klein">Try: “europa set”, “where does Gjallarhorn drop”, “Last Wish”, “freeze”, “Nessus”.</p>`;
    }
    el.querySelector('#wInhalt').innerHTML = inhalt;
  };
  el.innerHTML = `<div class="kopf"><h1>Wiki</h1><input id="wsuche" type="search" placeholder="Ask: europa set, where does Gjallarhorn drop…" value="${esc(ansicht.suche)}"></div><div id="wInhalt"></div>`;
  zeichne();
  const f = el.querySelector('#wsuche');
  let t;
  f.oninput = () => { clearTimeout(t); t = setTimeout(() => { ansicht.suche = f.value.trim(); zeichne(); }, 180); };
  el.onclick = (e) => {
    const k = e.target.closest('[data-kat]');
    if (k) { ansicht.kat = k.dataset.kat; return zeichne(); }
    if (e.target.closest('[data-zurueck]')) { ansicht.kat = null; return zeichne(); }
    const w = e.target.closest('[data-wk]');
    if (w) { const id = w.dataset.wk; if (offen.has(id)) offen.delete(id); else offen.add(id); const a = el.querySelector(`.wz[data-w="${CSS.escape(id)}"]`); const ein = liste.find((x) => ID(x) === id); a.outerHTML = zeile(ein, a.classList.contains('antwort')); }
  };
}
