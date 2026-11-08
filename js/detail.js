// Item-Detail: Perk-Spalten wie im Spiel, Perks und Mods umstellen, Verschieben, Ausrüsten, Postmaster.
import * as bungie from './bungie.js';
import { defs } from './defs.js';
import { NEBENSACHE, merkeAenderung, sammle } from './vault.js';
import { empfehlung } from './rolls.js';

const BILD = 'https://www.bungie.net';
const KLASSE = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
let proPc = null;
function alleMit(pc) {
  if (!proPc) { proPc = new Map(); for (const [h, d] of Object.entries(defs.items)) if (d.t === 19 && d.pc && d.i && d.n && !/deprecated/i.test(d.k || '') && !/^Empty/.test(d.n)) proPc.set(d.pc, [...(proPc.get(d.pc) || []), Number(h)]); }
  const gesehen = new Set();
  return (proPc.get(pc) || []).filter((h) => { const n = defs.items[h].n; if (gesehen.has(n)) return false; gesehen.add(n); return true; });
}
export const plugOk = (h) => { const p = defs.items[h]; return p && p.n && p.i && !NEBENSACHE.test(p.pc || '') && !/^Empty|Default (Shader|Ornament)/.test(p.n); };

let dlg = null;
function fenster() {
  if (dlg) return dlg;
  dlg = document.createElement('dialog');
  dlg.id = 'detail';
  // Meldungen im Dialog zeigen, sonst liegen sie hinter dem abgedunkelten Hintergrund.
  dlg.addEventListener('close', () => document.body.append(document.querySelector('#meldung')));
  document.body.append(dlg);
  return dlg;
}

export function oeffneDetail(it, zustand, neuZeichnen) {
  if (!it) return;
  it.m = it.m || {};
  const d = fenster();
  const k = zustand.konto;
  const chars = Object.values(zustand.profil.characters?.data || {}).sort((a, b) => new Date(b.dateLastPlayed) - new Date(a.dateLastPlayed));
  const name = (cid) => KLASSE[chars.find((c) => c.characterId === cid)?.classType] || 'Character';
  const passt = (c) => it.d.c === 3 || it.d.c === c.classType;
  let spalten = [];
  let wahl = null;
  let beschaeftigt = false;

  const ortText = () => it.ort === 'tresor' ? 'Vault' : it.ort.startsWith('post:') ? `Postmaster (${name(it.ort.slice(5))})` : `${name(it.ort)}${it.angelegt ? ', equipped' : ''}`;
  // Aktionen je Charakter gebündelt (Ausrüsten + Hinbringen), daneben Tresor und Sperre.
  const knoepfe = () => {
    const gruppen = chars.map((c) => {
      const hier = it.ort === c.characterId;
      const an = passt(c) && !(hier && it.angelegt);
      const zu = !hier;
      if (!an && !zu) return `<div class="cgruppe aktiv"><span>${KLASSE[c.classType]}</span><em>${it.angelegt ? 'Equipped' : 'Here'}</em></div>`;
      return `<div class="cgruppe ${hier ? 'aktiv' : ''}"><span>${KLASSE[c.classType]}</span>${an ? `<button data-a="an" data-c="${c.characterId}" class="haupt-knopf" title="Move here if needed, then equip">Equip</button>` : ''}${zu ? `<button data-a="zu" data-c="${c.characterId}" title="Move to ${KLASSE[c.classType]}">Transfer</button>` : ''}</div>`;
    }).join('');
    const rest = `${it.ort.startsWith('post:') ? '<button data-a="hol">📬 Pull from Postmaster</button>' : ''}${it.ort !== 'tresor' ? '<button data-a="tresor" title="Send to vault">To Vault</button>' : '<span class="imtresor">In vault</span>'}<button class="lockk" data-lock="${it.id}" aria-pressed="${it.locked}" title="${it.locked ? 'Unlock' : 'Lock'}">${it.locked ? '🔒' : '🔓'}</button>`;
    return `<div class="cgruppen">${gruppen}</div><div class="arest">${rest}</div>`;
  };
  // Lange Spalten (z. B. Weapon Mods) zeigen nur den aktiven Plug, ein Klick klappt sie als breites Raster auf.
  let offen = null;
  const emp = it.d.q === 6 ? null : empfehlung(it.hash);
  const knopf = (sp, h) => {
    const p = defs.items[h];
    const tipp = '';
    const god = emp && [emp.ge?.[0] || [], emp.gv?.[0] || []].some((k) => k.includes(h));
    const rt = emp ? `${emp.e?.includes(h) ? 'rt-pve' : ''} ${emp.v?.includes(h) ? 'rt-pvp' : ''} ${god ? 'rt-god' : ''}` : '';
    return `<button class="pl ${rt} ${h === sp.aktiv ? 'an' : ''} ${wahl?.h === h && wahl?.s === sp.s ? 'wahl' : ''}" data-s="${sp.s}" data-h="${h}" title="${esc(p.n)}" style="background-image:url(${BILD}${p.i})">${tipp}</button>`;
  };
  const raster = () => spalten.map((sp) => {
    if (sp.plugs.length <= 6) return `<div class="pcol"><small>${esc(sp.art)}</small>${sp.plugs.map((h) => knopf(sp, h)).join('')}</div>`;
    const auf = offen === sp.s;
    return `<div class="pcol ${auf ? 'breit' : ''}"><small>${esc(sp.art)}</small>${auf ? sp.plugs.map((h) => knopf(sp, h)).join('') : knopf(sp, sp.aktiv)}
      <button class="mehr" data-mehr="${sp.s}">${auf ? 'Less' : `+${sp.plugs.length - 1}`}</button></div>`;
  }).join('');
  const infoBox = () => {
    if (!wahl) return `<p class="leer klein">Click a perk or mod to read it. Click “Apply” to switch to it.${emp ? ' <span class="legende"><span><i class="rt rt-pve"></i> PvE pick</span><span><i class="rt rt-pvp"></i> PvP pick</span><span><i class="rt rt-god"></i> god roll perk</span><small>Community wish list (DIM voltron)</small></span>' : ''}</p>`;
    const p = defs.items[wahl.h];
    const sp = spalten.find((x) => x.s === wahl.s);
    const aktiv = sp?.aktiv === wahl.h;
    return `<div class="pinfo"><b>${esc(p.n)}</b><small>${esc(p.k || '')}</small><p>${esc(p.d || 'No description.')}</p>
      ${aktiv ? '<em>Active</em>' : sp.plugs.length > 1 ? '<button data-a="setz" class="haupt-knopf">Apply</button>' : ''}</div>`;
  };
  let stats = '';
  // Alle Kopien derselben Waffe/Rüstung nebeneinander, mit Perks, Roll-Bewertung und Sperren.
  const kopien = () => {
    const alle = (zustand.alleItems || sammle(zustand.profil)).filter((x) => x.d.n === it.d.n && x.id !== it.id);
    if (!alle.length) return '';
    const zeile = (x) => {
      const perks = x.plugs.map((p) => defs.items[p]).filter((p) => p?.i && /frames|barrels|magazines|tubes|stocks|grips|scopes|arrows|blades|guards|batteries|hafts|bowstrings/.test(p.pc || ''));
      return `<div class="kopie"><button class="kp-oeffnen" data-oeffne="${x.id}" title="Open this copy">${x.power || ''}</button>
        <span class="kp-perks">${perks.slice(0, 6).map((p) => `<span class="kpp" title="${esc(p.d || p.n)}"><i style="background-image:url(${BILD}${p.i})"></i>${esc(p.n)}</span>`).join('')}${x.st ? `<span class="kpp">Total ${x.st.Total}</span>` : ''}</span>
        <small>${esc(x.m?.roll || '')}${x.m?.roll ? ' · ' : ''}${esc(x.m?.ort || '')}${x.junk ? ' · <span class="rot">dismantle suggestion</span>' : ''}</small>
        <button class="kp-lock" data-lock="${x.id}" aria-pressed="${x.locked}">${x.locked ? '🔒' : '🔓'}</button></div>`;
    };
    return `<details class="kopien" ${alle.length < 4 ? 'open' : ''}><summary>Your other copies (${alle.length})</summary>${alle.map(zeile).join('')}</details>`;
  };
  const zeichne = (laed = false) => {
    const m = document.querySelector('#meldung');
    d.innerHTML = `<div class="dkopf"><i class="ic ${it.d.q === 6 ? 'exotic' : ''} ${it.d.t === 3 ? `el-${it.element}` : ''}" style="background-image:url(${BILD}${it.d.i})"></i>
      <div><h2>${esc(it.d.n)}</h2><small>${esc(it.d.k)}${it.power ? ` · ${it.power}` : ''}${it.m.frame ? ` · ${esc(it.m.frame)}` : ''}${it.m.champ ? ` · Stuns ${esc(it.m.champ)}` : ''}${it.m.set ? ` · ${esc(it.m.set)}` : ''}</small>
      ${it.m?.roll ? `<small class="rollinfo ${/PvP/.test(it.m.roll) ? 'pvp' : ''}">${it.m.roll}</small>` : ''}<small class="wo">${ortText()}${it.genutzt ? ' · in a loadout' : ''}${it.locked ? ' · locked' : ''}${it.junk ? ' · <span class="rot">dismantle suggestion</span>' : ''}${it.fuel ? ' · <span class="gold">infusion fuel</span>' : ''}</small></div><button class="zu" data-a="schliessen" aria-label="Close">✕</button></div>
      <div class="aktionen">${knoepfe()}</div>${it.grund && it.d.t === 3 ? `<p class="dputz ${it.junk ? 'weg' : ''}">${it.junk ? 'Can go' : 'Keeps'}: ${esc(it.grund)}</p>` : ''}${kopien()}
      ${laed ? '<p class="leer">Loading perks…</p>' : `<div class="dkoerper"><div class="pgrid">${raster() || '<p class="leer">No changeable perks.</p>'}</div><div class="dseite">${infoBox()}<div class="dstats">${stats}</div>${it.d.e && defs.sets?.[it.d.e] ? `<div class="tset"><b>${esc(defs.sets[it.d.e].n)}</b>${defs.sets[it.d.e].p.map((p) => `<span><em>${p.c}-piece · ${esc(p.n)}</em> ${esc(p.d)}</span>`).join('')}</div>` : ''}${it.d.xd ? `<p class="tt"><b class="tgold">${esc(it.d.xp || 'Exotic perk')}</b> ${esc(it.d.xd)}</p>` : ''}</div></div>`}`;
    if (d.open) d.append(m);
    d.querySelectorAll('button').forEach((x) => { x.disabled = beschaeftigt && x.dataset.a !== 'schliessen'; });
  };
  zeichne(true);
  if (!d.open) { d.showModal(); d.append(document.querySelector('#meldung')); }

  bungie.item(k, it.id).then((r) => {
    const moegl = r.reusablePlugs?.data?.plugs || {};
    spalten = (r.sockets?.data?.sockets || []).map((s, i) => {
      let liste = (moegl[i] || []).map((p) => p.plugItemHash);
      const pc = defs.items[s.plugHash]?.pc || '';
      // Mods und Subclass-Teile: Bungie liefert hier keine Auswahl, also alle passenden aus den Spieldaten.
      if (!liste.length && /^enhancements\.v2_|\.(aspects|fragments|supers|grenades|melee|class_abilities|movement)$/.test(pc)) liste = alleMit(pc);
      const plugs = [...new Set([s.plugHash, ...liste])].filter(plugOk);
      return { s: i, aktiv: s.plugHash, art: defs.items[s.plugHash]?.k || '', plugs };
    }).filter((sp) => sp.plugs.length && sp.art !== 'Combat Flair');
    stats = Object.values(r.stats?.data?.stats || {}).map((s) => ({ n: defs.stats?.[s.statHash]?.n, v: s.value })).filter((s) => s.n && s.v)
      .map((s) => `<div class="st"><span>${esc(s.n)}</span><i><b style="width:${Math.min(100, s.v)}%"></b></i><em>${s.v}</em></div>`).join('');
    zeichne();
  }).catch((e) => { d.innerHTML = `<p class="leer">${esc(e.message)}</p>`; });

  // Item an Ziel bringen: Postmaster → Charakter → Tresor → anderer Charakter.
  async function bringe(ziel) {
    let ort = it.ort;
    if (ort.startsWith('post:')) { ort = ort.slice(5); await bungie.abholen(k, it, ort); it.ort = ort; }
    if (ort === ziel) return;
    if (ort !== 'tresor') {
      if (it.angelegt) { const { ersatzAnlegen } = await import('./vault.js'); await ersatzAnlegen(zustand, it); }
      await bungie.verschiebe(k, it, ort, true); it.ort = 'tresor';
    }
    if (ziel !== 'tresor') { const { zumCharakter } = await import('./vault.js'); await zumCharakter(zustand, it, ziel, new Set([it.id])); it.ort = ziel; }
  }
  const melde = (text, fehler) => import('./app.js').then((m) => m.meldung(text, fehler));
  async function fuehreAus(a, cid) {
    beschaeftigt = true; zeichne();
    try {
      if (a === 'hol') { await bringe(it.ort.slice(5)); melde('Pulled from Postmaster.'); }
      if (a === 'zu') { await bringe(cid); melde(`Moved to ${name(cid)}.`); }
      if (a === 'tresor') { await bringe('tresor'); melde('Moved to Vault.'); }
      if (a === 'an') {
        const vorher = sammle(zustand.profil).filter((x) => x.ort === cid && x.angelegt && x.d.b === it.d.b && x.id !== it.id);
        await bringe(cid);
        await bungie.ausruesten(k, it, cid);
        for (const x of vorher) merkeAenderung(x.id, { ort: cid, angelegt: false });
        it.angelegt = true;
        melde(`Equipped on ${name(cid)}.`);
      }
      if (a === 'setz') {
        const cid2 = it.ort.startsWith('post:') ? it.ort.slice(5) : it.ort === 'tresor' ? chars[0].characterId : it.ort;
        await bungie.plugSetzen(k, it, cid2, wahl.s, wahl.h);
        const sp = spalten.find((x) => x.s === wahl.s);
        it.plugs = it.plugs.map((p) => (p === sp.aktiv ? wahl.h : p));
        sp.aktiv = wahl.h;
        melde(`${defs.items[wahl.h].n} applied.`);
      }
    } catch (e) {
      melde(e.message, true);
    } finally {
      merkeAenderung(it.id, { ort: it.ort, angelegt: it.angelegt });
      beschaeftigt = false; zeichne(); neuZeichnen();
    }
  }
  d.onclick = (e) => {
    if (e.target === d) return d.close();
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.a === 'schliessen') return d.close();
    if (b.dataset.mehr) { offen = offen === Number(b.dataset.mehr) ? null : Number(b.dataset.mehr); return zeichne(); }
    if (b.dataset.h) { wahl = { s: Number(b.dataset.s), h: Number(b.dataset.h) }; return zeichne(); }
    if (b.dataset.oeffne) { const x = (zustand.alleItems || sammle(zustand.profil)).find((y) => y.id === b.dataset.oeffne); if (x) return oeffneDetail(x, zustand, neuZeichnen); }
    if (b.dataset.lock) {
      const x = b.dataset.lock === it.id ? it : (zustand.alleItems || sammle(zustand.profil)).find((y) => y.id === b.dataset.lock);
      const cid = x.ort === 'tresor' || x.ort.startsWith('post:') ? chars[0].characterId : x.ort;
      bungie.post('/Destiny2/Actions/Items/SetLockState/', { state: !x.locked, itemId: x.id, characterId: cid, membershipType: k.membershipType })
        .then(() => { x.locked = !x.locked; zeichne(); }).catch((err) => import('./app.js').then((mm) => mm.meldung(err.message, true)));
      return;
    }
    if (b.dataset.a) fuehreAus(b.dataset.a, b.dataset.c);
  };
}
