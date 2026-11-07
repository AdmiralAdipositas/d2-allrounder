// Ingame-Loadouts: ansehen, mit einem Klick ausrüsten (holt fehlende Teile selbst), aktuelles Gear speichern.
import * as bungie from './bungie.js';
import { defs } from './defs.js';
import { sammle, merkeAenderung } from './vault.js';
import { meldung } from './app.js';

const BILD = 'https://www.bungie.net';
const KLASSE = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
let charWahl = null;
let laeuft = false;

// Alle Items im Profil (auch Subclass, Ghost usw.) für Icons.
function alleHashes(profil) {
  const m = new Map();
  const nimm = (it) => it.itemInstanceId && m.set(it.itemInstanceId, it.itemHash);
  for (const it of profil.profileInventory?.data?.items || []) nimm(it);
  for (const inv of Object.values(profil.characterInventories?.data || {})) inv.items.forEach(nimm);
  for (const inv of Object.values(profil.characterEquipment?.data || {})) inv.items.forEach(nimm);
  return m;
}

async function bringe(k, it, ziel) {
  let ort = it.ort;
  if (ort.startsWith('post:')) { ort = ort.slice(5); await bungie.abholen(k, it, ort); }
  if (ort === ziel) return;
  if (ort !== 'tresor') { if (it.angelegt) throw new Error(`${it.d.n} is equipped on another character.`); await bungie.verschiebe(k, it, ort, true); }
  await bungie.verschiebe(k, it, ziel, false);
  it.ort = ziel;
  merkeAenderung(it.id, { ort: ziel, angelegt: false });
}

export function zeigeLoadouts(haupt, zustand) {
  const profil = zustand.profil;
  const chars = Object.values(profil.characters?.data || {}).sort((a, b) => new Date(b.dateLastPlayed) - new Date(a.dateLastPlayed));
  if (!charWahl || !chars.some((c) => c.characterId === charWahl)) charWahl = chars[0]?.characterId;
  const hashes = alleHashes(profil);
  let bestaetigen = null;
  let loeschen = null;

  const zeichne = () => {
    const los = profil.characterLoadouts?.data?.[charWahl]?.loadouts || [];
    haupt.innerHTML = `<div class="kopf"><h1>Loadouts</h1><span class="platz"></span><div class="chips">${chars.map((c) => `<button class="chip" data-char="${c.characterId}" aria-pressed="${c.characterId === charWahl}">${KLASSE[c.classType]} <small>${c.light}</small></button>`).join('')}</div></div>
      <div class="loraster">${los.map((l, i) => {
        const items = (l.items || []).filter((x) => x.itemInstanceId && x.itemInstanceId !== '0');
        const leer = !items.length;
        const name = defs.lo?.n?.[l.nameHash] || `Slot ${i + 1}`;
        return `<article class="lo ${leer ? 'leer-slot' : ''}">
          <div class="lo-kopf"><i class="lo-icon" style="background-image:url(${BILD}${defs.lo?.i?.[l.iconHash] || ''}),url(${BILD}${defs.lo?.f?.[l.colorHash] || ''})"></i><b>${leer ? `Empty slot ${i + 1}` : esc(name)}</b><small>#${i + 1}</small></div>
          <div class="lo-items">${items.map((x) => { const d = defs.items[hashes.get(x.itemInstanceId)]; return d ? `<i title="${esc(d.n)}" class="${d.q === 6 ? 'exo' : ''}" style="background-image:url(${BILD}${d.i})"></i>` : '<i class="fehlt" title="Item no longer exists"></i>'; }).join('')}</div>
          <div class="lo-knoepfe">${leer ? '' : `<button class="haupt-knopf" data-equip="${i}" ${laeuft ? 'disabled' : ''}>Equip</button>`}
            <button data-snap="${i}" ${laeuft ? 'disabled' : ''}>${bestaetigen === i ? 'Click again to overwrite' : 'Save current gear here'}</button>
            ${leer ? '' : `<button class="loeschen" data-clear="${i}" ${laeuft ? 'disabled' : ''}>${loeschen === i ? 'Click again to delete' : 'Delete'}</button>`}</div>
        </article>`;
      }).join('') || '<p class="leer">No in-game loadouts on this character.</p>'}</div>`;
  };
  zeichne();

  haupt.onclick = async (e) => {
    const c = e.target.closest('[data-char]');
    if (c) { charWahl = c.dataset.char; bestaetigen = loeschen = null; return zeichne(); }
    const cl = e.target.closest('[data-clear]');
    if (cl && !laeuft) {
      const i = Number(cl.dataset.clear);
      if (loeschen !== i) { loeschen = i; bestaetigen = null; return zeichne(); }
      loeschen = null; laeuft = true; zeichne();
      try {
        await bungie.post('/Destiny2/Actions/Loadouts/ClearLoadout/', { loadoutIndex: i, characterId: charWahl, membershipType: zustand.konto.membershipType });
        const lo = profil.characterLoadouts.data[charWahl].loadouts[i];
        lo.items = [];
        meldung(`Loadout slot ${i + 1} cleared.`);
      } catch (err) { meldung(err.message, true); }
      laeuft = false; return zeichne();
    }
    const k = zustand.konto;
    const eq = e.target.closest('[data-equip]');
    if (eq && !laeuft) {
      const i = Number(eq.dataset.equip);
      const lo = profil.characterLoadouts.data[charWahl].loadouts[i];
      laeuft = true; zeichne();
      try {
        const liste = sammle(profil);
        const fehler = [];
        for (const x of lo.items || []) {
          const it = liste.find((a) => a.id === x.itemInstanceId);
          if (!it || it.ort === charWahl) continue;
          meldung(`Moving ${it.d.n}…`);
          try { await bringe(k, it, charWahl); } catch (err) { fehler.push(err.message); }
        }
        await bungie.post('/Destiny2/Actions/Loadouts/EquipLoadout/', { loadoutIndex: i, characterId: charWahl, membershipType: k.membershipType });
        meldung(fehler.length ? `Equipped, but: ${fehler.join(' ')}` : `${defs.lo?.n?.[lo.nameHash] || 'Loadout'} equipped.`, fehler.length > 0);
      } catch (err) { meldung(err.message, true); }
      laeuft = false; zeichne();
      return;
    }
    const sn = e.target.closest('[data-snap]');
    if (sn && !laeuft) {
      const i = Number(sn.dataset.snap);
      if (bestaetigen !== i) { bestaetigen = i; loeschen = null; return zeichne(); }
      bestaetigen = null;
      const lo = profil.characterLoadouts.data[charWahl].loadouts[i];
      const erst = (o) => Number(Object.keys(o || {}).find((h) => o[h]) || 0);
      laeuft = true; zeichne();
      try {
        await bungie.post('/Destiny2/Actions/Loadouts/SnapshotLoadout/', {
          loadoutIndex: i, characterId: charWahl, membershipType: k.membershipType,
          nameHash: lo.nameHash || erst(defs.lo?.n), iconHash: lo.iconHash || erst(defs.lo?.i), colorHash: lo.colorHash || erst(defs.lo?.f),
        });
        meldung('Current gear saved to this slot. Bungie shows it in about a minute (Refresh).');
      } catch (err) { meldung(err.message, true); }
      laeuft = false; zeichne();
    }
  };
}
