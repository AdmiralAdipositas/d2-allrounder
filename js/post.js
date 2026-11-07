// Postmaster: alles, was in der Poststelle liegt (auch Engramme und Stapel), einzeln oder komplett abholen.
import * as bungie from './bungie.js';
import { defs } from './defs.js';
import { merkeAenderung, sammle, NEBENSACHE, ARMOR_STATS } from './vault.js';
import { oeffneDetail } from './detail.js';
import { meldung, ladeProfil } from './app.js';

const POST = 215593132;
const BILD = 'https://www.bungie.net';
const KLASSE = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const fremd = new Map();
const abgeholt = new Set();

export function postAnzahl(profil) {
  return Object.values(profil?.characterInventories?.data || {}).reduce((a, inv) => a + inv.items.filter((i) => i.bucketHash === POST && !abgeholt.has(schluessel(i))).length, 0);
}
const schluessel = (i) => i.itemInstanceId || `${i.itemHash}:${i.quantity}`;

// Items, die nicht in unseren Spieldaten stecken (z. B. Materialien), einzeln bei Bungie nachschlagen.
async function def(hash) {
  if (defs.items[hash]) return defs.items[hash];
  if (!fremd.has(hash)) fremd.set(hash, bungie.get(`/Destiny2/Manifest/DestinyInventoryItemDefinition/${hash}/`).then((d) => ({ n: d.displayProperties?.name || 'Item', i: d.displayProperties?.icon || '', q: d.inventory?.tierType || 0, k: d.itemTypeDisplayName || '' })).catch(() => ({ n: 'Item', i: '', q: 0, k: '' })));
  return fremd.get(hash);
}

export async function zeigePost(el, zustand) {
  const profil = zustand.profil;
  const chars = Object.values(profil.characters?.data || {}).sort((a, b) => new Date(b.dateLastPlayed) - new Date(a.dateLastPlayed));
  const proChar = [];
  for (const c of chars) {
    const items = (profil.characterInventories?.data?.[c.characterId]?.items || []).filter((i) => i.bucketHash === POST && !abgeholt.has(schluessel(i)));
    proChar.push({ c, items: await Promise.all(items.map(async (i) => ({ i, d: await def(i.itemHash) }))) });
  }
  let laeuft = false;
  const zeichne = () => {
    const summe = proChar.reduce((a, x) => a + x.items.length, 0);
    el.innerHTML = `<div class="kopf"><h1>Postmaster</h1><span class="tag ${summe ? 'gold' : ''}">${summe} items</span><span class="platz"></span><button class="chip" id="pNeu">↻ Refresh</button></div>
      ${proChar.map(({ c, items }) => `<section class="karte post"><div class="post-kopf"><h3>${KLASSE[c.classType]} <small>${items.length} / 21</small></h3>
        ${items.length ? `<button class="haupt-knopf" data-alle="${c.characterId}" ${laeuft ? 'disabled' : ''}>Pull all</button>` : ''}</div>
        ${items.length ? `<div class="raster">${items.map(({ i, d }, n) => `<button class="ic pk ${d.q === 6 ? 'exotic' : ''}" data-c="${c.characterId}" data-n="${n}" aria-label="${esc(d.n)}${i.quantity > 1 ? ` ×${i.quantity}` : ''}" data-pid="${i.itemInstanceId || ''}" style="background-image:url(${BILD}${d.i})" ${laeuft ? 'disabled' : ''}>${i.quantity > 1 ? `<span class="pow">${i.quantity}</span>` : ''}</button>`).join('')}</div>` : '<p class="leer">Empty.</p>'}
        ${items.length >= 18 ? '<p class="rot klein">Almost full – items beyond 21 are lost.</p>' : ''}</section>`).join('')}`;
  };
  const hole = async (cid, n) => {
    const eintrag = proChar.find((x) => x.c.characterId === cid);
    const { i, d } = eintrag.items[n];
    await bungie.abholen(zustand.konto, { hash: i.itemHash, id: i.itemInstanceId || '0', menge: i.quantity }, cid);
    abgeholt.add(schluessel(i));
    if (i.itemInstanceId) merkeAenderung(i.itemInstanceId, { ort: cid, angelegt: false });
    eintrag.items.splice(n, 1);
    return d.n;
  };
  zeichne();
  // Vorschau statt Sofort-Abholen: Hover zeigt Perks/Stats, Klick öffnet die Detailansicht (dort "Pull from Postmaster").
  // Ohne Instanz (Materialien, Engramme): erster Klick markiert, zweiter holt ab.
  const tipp = document.querySelector('#tipp');
  const mitInstanz = () => sammle(zustand.profil);
  let markiert = null;
  const zeigeTipp = (t) => {
    const { i, d } = proChar.find((x) => x.c.characterId === t.dataset.c).items[Number(t.dataset.n)];
    const it = i.itemInstanceId ? mitInstanz().find((x) => x.id === i.itemInstanceId) : null;
    const perks = it ? it.plugs.map((p) => defs.items[p]).filter((p) => p?.i && p.pc && !NEBENSACHE.test(p.pc)) : [];
    tipp.innerHTML = `<b>${esc(d.n)}</b><small>${esc(d.k || '')}${it?.power ? ` · ${it.power}` : ''}${i.quantity > 1 ? ` · ×${i.quantity}` : ''}</small>
      ${it?.st ? `<div class="tstats">${ARMOR_STATS.map((n) => `<span>${n.slice(0, 3)} <b>${it.st[n]}</b></span>`).join('')}<span>Total <b>${it.st.Total}</b></span></div>` : ''}
      ${d.xd ? `<p class="tt"><b class="tgold">${esc(d.xp || 'Exotic perk')}</b> ${esc(d.xd)}</p>` : ''}
      ${perks.length ? `<div class="tperks">${perks.slice(0, 10).map((p) => `<div><i style="background-image:url(${BILD}${p.i})"></i><span><b>${esc(p.n)}</b></span></div>`).join('')}</div>` : ''}
      <small class="thint">${it ? 'Click for details and Pull' : 'Click twice to pull'}</small>`;
    tipp.hidden = false;
    const r = t.getBoundingClientRect(), b = tipp.getBoundingClientRect();
    tipp.style.left = `${Math.max(8, Math.min(r.right + 8, innerWidth - b.width - 8))}px`;
    tipp.style.top = `${Math.max(8, Math.min(r.top, innerHeight - b.height - 8))}px`;
  };
  el.onpointerover = (e) => { const t = e.target.closest('.pk'); if (t && e.pointerType === 'mouse') zeigeTipp(t); };
  el.onpointerout = (e) => { if (e.target.closest('.pk')) tipp.hidden = true; };
  el.onclick = async (e) => {
    if (laeuft) return;
    const v = e.target.closest('.pk');
    if (v && !e.target.closest('[data-alle]')) {
      tipp.hidden = true;
      const it = v.dataset.pid ? mitInstanz().find((x) => x.id === v.dataset.pid) : null;
      if (it) return oeffneDetail(it, zustand, () => { if (!it.ort.startsWith('post:')) abgeholt.add(it.id); zeigePost(el, zustand); });
      const key = `${v.dataset.c}:${v.dataset.n}`;
      if (markiert !== key) { markiert = key; el.querySelectorAll('.pk.markiert').forEach((x) => x.classList.remove('markiert')); v.classList.add('markiert'); zeigeTipp(v); return meldung('Click again to pull it.'); }
      markiert = null;
    }
    if (e.target.id === 'pNeu') { await ladeProfil(); abgeholt.clear(); return zeigePost(el, zustand); }
    const t = e.target.closest('.pk');
    const alle = e.target.closest('[data-alle]');
    if (!t && !alle) return;
    laeuft = true; zeichne();
    try {
      if (t) meldung(`${await hole(t.dataset.c, Number(t.dataset.n))} pulled.`);
      if (alle) {
        const eintrag = proChar.find((x) => x.c.characterId === alle.dataset.alle);
        let ok = 0; const fehler = [];
        while (eintrag.items.length > fehler.length) {
          try { await hole(alle.dataset.alle, fehler.length); ok += 1; } catch (err) { fehler.push(err.message); }
          zeichne();
        }
        meldung(fehler.length ? `${ok} pulled, ${fehler.length} failed: ${fehler[0]}` : `${ok} items pulled.`, fehler.length > 0);
      }
    } catch (err) { meldung(err.message, true); }
    laeuft = false; zeichne();
  };
}
