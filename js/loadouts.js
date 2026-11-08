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
  if (ort !== 'tresor') { if (it.angelegt) { const { ersatzAnlegen } = await import('./vault.js'); const { zustand } = await import('./app.js'); await ersatzAnlegen(zustand, it); } await bungie.verschiebe(k, it, ort, true); }
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
  let bearbeite = null; // { i, n, ic, f } während der Name/Icon/Farbe-Auswahl

  // Wie im Spiel: Name, Symbol und Farbe aus Bungies festen Listen wählen.
  const editor = () => {
    const b = bearbeite;
    const vorschau = `background-image:url(${BILD}${defs.lo?.i?.[b.ic] || ''}),url(${BILD}${defs.lo?.f?.[b.f] || ''})`;
    return `<div class="lo-editor"><div class="lo-vor"><i class="lo-icon gross" style="${vorschau}"></i><b>${esc(defs.lo?.n?.[b.n] || '')}</b></div>
      <small>Name</small><div class="lo-wahl">${Object.entries(defs.lo?.n || {}).map(([h, n]) => `<button class="chip" data-lon="${h}" aria-pressed="${String(b.n) === h}">${esc(n)}</button>`).join('')}</div>
      <small>Icon</small><div class="lo-wahl">${Object.entries(defs.lo?.i || {}).map(([h, u]) => `<button class="lo-sw" data-loi="${h}" aria-pressed="${String(b.ic) === h}" style="background-image:url(${BILD}${u}),url(${BILD}${defs.lo?.f?.[b.f] || ''})"></button>`).join('')}</div>
      <small>Color</small><div class="lo-wahl">${Object.entries(defs.lo?.f || {}).map(([h, u]) => `<button class="lo-sw" data-lof="${h}" aria-pressed="${String(b.f) === h}" style="background-image:url(${BILD}${u})"></button>`).join('')}</div>
      <div class="lo-knoepfe"><button class="haupt-knopf" data-losave ${laeuft ? 'disabled' : ''}>Save</button><button data-locancel>Cancel</button></div></div>`;
  };

  const zeichne = () => {
    const los = profil.characterLoadouts?.data?.[charWahl]?.loadouts || [];
    haupt.innerHTML = `<div class="kopf"><h1>Loadouts</h1><span class="platz"></span><div class="chips">${chars.map((c) => `<button class="chip" data-char="${c.characterId}" aria-pressed="${c.characterId === charWahl}">${KLASSE[c.classType]} <small>${c.light}</small></button>`).join('')}</div></div>
      <div class="loraster">${los.map((l, i) => {
        const items = (l.items || []).filter((x) => x.itemInstanceId && x.itemInstanceId !== '0');
        const leer = !items.length;
        const name = defs.lo?.n?.[l.nameHash] || `Slot ${i + 1}`;
        return `<article class="lo ${leer ? 'leer-slot' : ''}">
          <div class="lo-kopf"><i class="lo-icon" style="background-image:url(${BILD}${defs.lo?.i?.[l.iconHash] || ''}),url(${BILD}${defs.lo?.f?.[l.colorHash] || ''})"></i><b>${leer ? `Empty slot ${i + 1}` : esc(name)}</b><small>#${i + 1}</small>${leer ? '' : `<button class="lo-edit" data-edit="${i}" title="Change name, icon and color" aria-label="Edit">✎</button>`}</div>
          ${bearbeite?.i === i ? editor() : ''}
          <div class="lo-items">${items.map((x) => { const d = defs.items[hashes.get(x.itemInstanceId)]; return d ? `<i data-ih="${hashes.get(x.itemInstanceId)}" class="${d.q === 6 ? 'exo' : ''}" style="background-image:url(${BILD}${d.i})"></i>` : '<i class="fehlt" title="Item no longer exists"></i>'; }).join('')}</div>
          <div class="lo-knoepfe">${leer ? '' : `<button class="haupt-knopf" data-equip="${i}" ${laeuft ? 'disabled' : ''}>Equip</button>`}
            <button data-snap="${i}" data-leer="${leer ? 1 : 0}" ${laeuft ? 'disabled' : ''}>${bestaetigen === i ? 'Click again to overwrite' : 'Save current gear here'}</button>
 ${leer ? '' : `<button data-teilen="${i}" ${laeuft ? 'disabled' : ''} title="Copy a DIM link">🔗 DIM link</button><button data-bild="${i}" title="Share as image">📸 Card</button>`}
            ${leer ? '' : `<button class="loeschen" data-clear="${i}" ${laeuft ? 'disabled' : ''}>${loeschen === i ? 'Click again to delete' : 'Delete'}</button>`}</div>
        </article>`;
      }).join('') || '<p class="leer">No in-game loadouts on this character.</p>'}</div>`;
  };
  zeichne();

  haupt.onclick = async (e) => {
    const ed = e.target.closest('[data-edit]');
    if (ed) { const i = Number(ed.dataset.edit); const l = profil.characterLoadouts.data[charWahl].loadouts[i]; bearbeite = bearbeite?.i === i ? null : { i, n: l.nameHash, ic: l.iconHash, f: l.colorHash }; return zeichne(); }
    if (bearbeite) {
      const w = e.target.closest('[data-lon],[data-loi],[data-lof]');
      if (w) { if (w.dataset.lon) bearbeite.n = Number(w.dataset.lon); if (w.dataset.loi) bearbeite.ic = Number(w.dataset.loi); if (w.dataset.lof) bearbeite.f = Number(w.dataset.lof); return zeichne(); }
      if (e.target.closest('[data-locancel]')) { bearbeite = null; return zeichne(); }
      if (e.target.closest('[data-losave]') && !laeuft) {
        const b = bearbeite; laeuft = true; zeichne();
        try {
          await bungie.post('/Destiny2/Actions/Loadouts/UpdateLoadoutIdentifiers/', { loadoutIndex: b.i, characterId: charWahl, membershipType: zustand.konto.membershipType, nameHash: b.n, iconHash: b.ic, colorHash: b.f });
          Object.assign(profil.characterLoadouts.data[charWahl].loadouts[b.i], { nameHash: b.n, iconHash: b.ic, colorHash: b.f });
          meldung(`Loadout renamed to ${defs.lo?.n?.[b.n] || 'new name'}.`);
          bearbeite = null;
        } catch (err) { meldung(err.message, true); }
        laeuft = false; return zeichne();
      }
    }
    const c = e.target.closest('[data-char]');
    if (c) { charWahl = c.dataset.char; bestaetigen = loeschen = null; return zeichne(); }
    const bi = e.target.closest('[data-bild]');
    if (bi) {
      const lo = profil.characterLoadouts.data[charWahl].loadouts[Number(bi.dataset.bild)];
      const ds = (lo.items || []).map((x) => defs.items[hashes.get(x.itemInstanceId)]).filter(Boolean);
      const ch = chars.find((c) => c.characterId === charWahl);
      const sub = ds.find((d) => d.t === 16);
      return import('./teilen.js').then((m) => m.teileKarte({ art: 'LOADOUT', titel: defs.lo?.n?.[lo.nameHash] || 'Loadout', unter: `${KLASSE[ch?.classType] || ''}${sub ? ` · ${sub.n}` : ''}`, hinter: ch?.emblemBackgroundPath,
        bilder: ds.filter((d) => d.t === 3 || d.t === 2).map((d) => d.i), zeilen: ds.filter((d) => d.t === 3 || (d.t === 2 && d.q === 6)).map((d) => [d.t === 3 ? d.k : 'Exotic', d.n]) }));
    }
    const te = e.target.closest('[data-teilen]');
    if (te) {
      // DIM-Link ohne Instanz-IDs: der Empfänger setzt seine eigenen Items ein. Subclass mit Aspekten/Fragmenten, Rüstungs-Mods als Parameter.
      const lo = profil.characterLoadouts.data[charWahl].loadouts[Number(te.dataset.teilen)];
      const equipped = [];
      const mods = [];
      for (const x of lo.items || []) {
        const h = hashes.get(x.itemInstanceId);
        const d = defs.items[h];
        if (!d) continue;
        const plugs = (x.plugItemHashes || []).filter((p) => p && defs.items[p] && !/^(Empty|Default)/.test(defs.items[p].n));
        if (d.t === 16) equipped.push({ hash: h, socketOverrides: Object.fromEntries((x.plugItemHashes || []).map((p, n) => [n, p]).filter(([, p]) => p && defs.items[p] && !/^Empty/.test(defs.items[p].n))) });
        else equipped.push({ hash: h });
        if (d.t === 2) mods.push(...plugs.filter((p) => /^enhancements\./.test(defs.items[p].pc || '')));
      }
      const name = defs.lo?.n?.[lo.nameHash] || 'Loadout';
      const cls = chars.find((c) => c.characterId === charWahl)?.classType ?? 3;
      const json = { id: Math.random().toString(16).slice(2, 12), name, notes: 'Shared from D2 Allrounder', classType: cls, clearSpace: false, equipped, unequipped: [], parameters: { mods } };
      const link = `https://app.destinyitemmanager.com/loadouts?loadout=${encodeURIComponent(JSON.stringify(json))}`;
      (navigator.clipboard?.writeText(link) || Promise.reject()).then(() => meldung(`DIM link for "${name}" copied. Paste it in Discord.${link.length > 2000 ? ' It is long – Discord may cut it, use a link shortener.' : ''}`))
        .catch(() => { window.prompt?.('Copy this DIM link:', link); });
      return;
    }
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
      if (sn.dataset.leer !== '1' && bestaetigen !== i) { bestaetigen = i; loeschen = null; return zeichne(); } // leerer Platz: ohne Rückfrage speichern
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
