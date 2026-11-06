// Item-Detail: Perk-Spalten wie im Spiel, Perks und Mods umstellen, Verschieben, Ausrüsten, Postmaster.
import * as bungie from './bungie.js';
import { defs } from './defs.js';
import { NEBENSACHE, merkeAenderung, sammle } from './vault.js';

const BILD = 'https://www.bungie.net';
const KLASSE = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const plugOk = (h) => { const p = defs.items[h]; return p && p.n && p.i && !NEBENSACHE.test(p.pc || '') && !/^Empty|Default (Shader|Ornament)/.test(p.n); };

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
  const d = fenster();
  const k = zustand.konto;
  const chars = Object.values(zustand.profil.characters?.data || {}).sort((a, b) => new Date(b.dateLastPlayed) - new Date(a.dateLastPlayed));
  const name = (cid) => KLASSE[chars.find((c) => c.characterId === cid)?.classType] || 'Character';
  const passt = (c) => it.d.c === 3 || it.d.c === c.classType;
  let spalten = [];
  let wahl = null;
  let beschaeftigt = false;

  const ortText = () => it.ort === 'tresor' ? 'Vault' : it.ort.startsWith('post:') ? `Postmaster (${name(it.ort.slice(5))})` : `${name(it.ort)}${it.angelegt ? ', equipped' : ''}`;
  const knoepfe = () => {
    const b = [];
    if (it.ort.startsWith('post:')) b.push(`<button data-a="hol">Pull from Postmaster</button>`);
    for (const c of chars) {
      if (passt(c) && !(it.ort === c.characterId && it.angelegt)) b.push(`<button data-a="an" data-c="${c.characterId}" class="haupt-knopf">Equip on ${KLASSE[c.classType]}</button>`);
      if (it.ort !== c.characterId) b.push(`<button data-a="zu" data-c="${c.characterId}">To ${KLASSE[c.classType]}</button>`);
    }
    if (it.ort !== 'tresor') b.push(`<button data-a="tresor">To Vault</button>`);
    return b.join('');
  };
  const raster = () => spalten.map((sp) => `<div class="pcol ${sp.plugs.length > 6 ? 'breit' : ''}"><small>${esc(sp.art)}</small>${sp.plugs.map((h) => {
    const p = defs.items[h];
    return `<button class="pl ${h === sp.aktiv ? 'an' : ''} ${wahl?.h === h && wahl?.s === sp.s ? 'wahl' : ''}" data-s="${sp.s}" data-h="${h}" title="${esc(p.n)}" style="background-image:url(${BILD}${p.i})"></button>`;
  }).join('')}</div>`).join('');
  const infoBox = () => {
    if (!wahl) return '<p class="leer klein">Click a perk or mod to read it. Click “Apply” to switch to it.</p>';
    const p = defs.items[wahl.h];
    const sp = spalten.find((x) => x.s === wahl.s);
    const aktiv = sp?.aktiv === wahl.h;
    return `<div class="pinfo"><b>${esc(p.n)}</b><small>${esc(p.k || '')}</small><p>${esc(p.d || 'No description.')}</p>
      ${aktiv ? '<em>Active</em>' : sp.plugs.length > 1 ? '<button data-a="setz" class="haupt-knopf">Apply</button>' : ''}</div>`;
  };
  let stats = '';
  const zeichne = (laed = false) => {
    const m = document.querySelector('#meldung');
    d.innerHTML = `<div class="dkopf"><i class="ic ${it.d.q === 6 ? 'exotic' : ''} ${it.d.t === 3 ? `el-${it.element}` : ''}" style="background-image:url(${BILD}${it.d.i})"></i>
      <div><h2>${esc(it.d.n)}</h2><small>${esc(it.d.k)}${it.power ? ` · ${it.power}` : ''}${it.m.frame ? ` · ${esc(it.m.frame)}` : ''}${it.m.champ ? ` · Stuns ${esc(it.m.champ)}` : ''}${it.m.set ? ` · ${esc(it.m.set)}` : ''}</small>
      <small class="wo">${ortText()}</small></div><button class="zu" data-a="schliessen" aria-label="Close">✕</button></div>
      <div class="aktionen">${knoepfe()}</div>
      ${laed ? '<p class="leer">Loading perks…</p>' : `<div class="dkoerper"><div><div class="pgrid">${raster() || '<p class="leer">No changeable perks.</p>'}</div>${infoBox()}</div><div class="dstats">${stats}</div></div>`}`;
    if (d.open) d.append(m);
    d.querySelectorAll('button').forEach((x) => { x.disabled = beschaeftigt && x.dataset.a !== 'schliessen'; });
  };
  zeichne(true);
  if (!d.open) { d.showModal(); d.append(document.querySelector('#meldung')); }

  bungie.item(k, it.id).then((r) => {
    const moegl = r.reusablePlugs?.data?.plugs || {};
    spalten = (r.sockets?.data?.sockets || []).map((s, i) => {
      const plugs = [...new Set([s.plugHash, ...(moegl[i] || []).map((p) => p.plugItemHash)])].filter(plugOk);
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
      if (it.angelegt) throw new Error('This item is equipped. Equip something else in that slot first.');
      await bungie.verschiebe(k, it, ort, true); it.ort = 'tresor';
    }
    if (ziel !== 'tresor') { await bungie.verschiebe(k, it, ziel, false); it.ort = ziel; }
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
    if (b.dataset.h) { wahl = { s: Number(b.dataset.s), h: Number(b.dataset.h) }; return zeichne(); }
    if (b.dataset.a) fuehreAus(b.dataset.a, b.dataset.c);
  };
}
