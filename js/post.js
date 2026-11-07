// Postmaster: alles, was in der Poststelle liegt (auch Engramme und Stapel), einzeln oder komplett abholen.
import * as bungie from './bungie.js';
import { defs } from './defs.js';
import { merkeAenderung } from './vault.js';
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
        ${items.length ? `<div class="raster">${items.map(({ i, d }, n) => `<button class="ic pk ${d.q === 6 ? 'exotic' : ''}" data-c="${c.characterId}" data-n="${n}" title="${esc(d.n)}${i.quantity > 1 ? ` ×${i.quantity}` : ''} – click to pull" style="background-image:url(${BILD}${d.i})" ${laeuft ? 'disabled' : ''}>${i.quantity > 1 ? `<span class="pow">${i.quantity}</span>` : ''}</button>`).join('')}</div>` : '<p class="leer">Empty.</p>'}
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
  el.onclick = async (e) => {
    if (laeuft) return;
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
