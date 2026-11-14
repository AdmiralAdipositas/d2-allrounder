// Item-Detail: Perk-Spalten wie im Spiel, Perks und Mods umstellen, Verschieben, Ausrüsten, Postmaster.
import * as bungie from './bungie.js';
import { defs } from './defs.js';
import { NEBENSACHE, merkeAenderung, sammle } from './vault.js';
import { rollWert, rollBalken, perkMarke } from './rolls.js';
import { PERKSPALTE, perkRaster, alleOptionen, PERK_LEGENDE } from './perks.js';
import { STAT_INFO, urteilZeile } from './itemtipp.js';
import { TAGS, tags, notizen, setzeTag, setzeNotiz } from './suche.js';

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

const SPALTE = { intrinsics: 'Frame', frames: 'Trait', origins: 'Origin', barrels: 'Barrel', scopes: 'Sight', magazines: 'Magazine', magazines_gl: 'Magazine', tubes: 'Tube', arrows: 'Arrow', batteries: 'Battery', blades: 'Blade', guards: 'Guard', hafts: 'Haft', bowstrings: 'String', stocks: 'Stock', grips: 'Grip' };
const UBK = { junk: 'JUNK', infuse: 'FUEL', best: 'BEST', frei: '?' };
const ELEM = { 1: 'Kinetic', 2: 'Arc', 3: 'Solar', 4: 'Void', 6: 'Stasis', 7: 'Strand' };

// Aufbau (fest, nichts verschiebt sich beim Laden):
//   Kopf · Urteil · Aktionen · Markierungen | Perks (alle Spalten) + Lesefeld | Werte | Mods | andere Kopien
// Perks, Werte und Kopien kommen direkt aus dem Profil – ohne Nachladen. Nur wenn das Profil noch keine Perk-Auswahl
// enthält (alter Zwischenspeicher), wird sie einmal nachgeholt und in den schon reservierten Platz gesetzt.
export function oeffneDetail(it, zustand, neuZeichnen) {
  if (!it) return;
  it.m = it.m || {};
  const d = fenster();
  const k = zustand.konto;
  const profil = zustand.profil;
  const chars = Object.values(profil.characters?.data || {}).sort((a, b) => new Date(b.dateLastPlayed) - new Date(a.dateLastPlayed));
  const name = (cid) => KLASSE[chars.find((c) => c.characterId === cid)?.classType] || 'Character';
  const passt = (x, c) => x.d.c === 3 || x.d.c === c.classType;
  const alleItems = () => zustand.alleItems || sammle(profil);
  let wahl = null, zeig = null, beschaeftigt = false, offen = null;
  const marke = it.d.q === 6 || it.d.t !== 3 ? null : perkMarke(it.hash);

  // Spalten aus Profil-Daten (Sockets 305 + wählbare Plugs 310).
  const baue = (sockets, moegl) => (sockets || []).map((s, i) => {
    let liste = (moegl?.[i] || []).map((p) => p.plugItemHash);
    const pd = defs.items[s.plugHash]; const pc = pd?.pc || '';
    if (!liste.length && /^enhancements\.v2_|\.(aspects|fragments|supers|grenades|melee|class_abilities|movement)$/.test(pc)) liste = alleMit(pc);
    const perk = PERKSPALTE.test(pc);
    const plugs = [...new Set([s.plugHash, ...liste])].filter((h) => (perk ? defs.items[h]?.i : plugOk(h)));
    return { s: i, aktiv: s.plugHash, perk, art: SPALTE[pc] || pd?.k || '', plugs };
  }).filter((sp) => sp.plugs.length && sp.art !== 'Combat Flair' && (sp.perk || sp.aktiv && plugOk(sp.aktiv) || sp.plugs.length > 1));
  const pSock = profil.itemComponents?.sockets?.data?.[it.id]?.sockets;
  const pMoegl = profil.itemComponents?.reusablePlugs?.data?.[it.id]?.plugs;
  let spalten = baue(pSock || (it.sockel || []).map((plugHash) => ({ plugHash })), pMoegl);
  let statRoh = Object.values(profil.itemComponents?.stats?.data?.[it.id]?.stats || {});

  const ortText = (x = it) => x.ort === 'tresor' ? 'Vault' : x.ort.startsWith('post:') ? `Postmaster (${name(x.ort.slice(5))})` : `${name(x.ort)}${x.angelegt ? ', equipped' : ''}`;
  const knoepfe = () => {
    const gruppen = chars.map((c) => {
      const hier = it.ort === c.characterId;
      const an = passt(it, c) && !(hier && it.angelegt);
      return `<div class="dx-ziel ${hier ? 'hier' : ''}"><span>${KLASSE[c.classType]}${hier ? `<em>${it.angelegt ? 'equipped' : 'here'}</em>` : ''}</span>${an ? `<button data-a="an" data-c="${c.characterId}" class="haupt-knopf" data-tip="Moves it to your ${KLASSE[c.classType]} if needed and equips it. A full slot is cleared automatically.">Equip</button>` : ''}${!hier ? `<button data-a="zu" data-c="${c.characterId}" data-tip="Moves it into your ${KLASSE[c.classType]}’s inventory without equipping.">Move</button>` : ''}</div>`;
    }).join('');
    return `${gruppen}<div class="dx-ziel ${it.ort === 'tresor' ? 'hier' : ''}"><span>Vault${it.ort === 'tresor' ? '<em>here</em>' : ''}</span>${it.ort.startsWith('post:') ? '<button data-a="hol" data-tip="Pulls it from the Postmaster to that character.">Pull</button>' : ''}${it.ort !== 'tresor' ? '<button data-a="tresor" data-tip="Sends it to the vault.">Store</button>' : ''}</div>
      <button class="dx-lock" data-lock="${it.id}" aria-pressed="${it.locked}" data-tip="${it.locked ? 'Locked in the game: cannot be dismantled. Click to unlock.' : 'Not locked. Click to lock it in the game so it cannot be dismantled by accident.'}">${it.locked ? '🔒 Locked' : '🔓 Lock'}</button>`;
  };
  const knopf = (sp, h) => {
    const p = defs.items[h]; const m = marke && sp.perk ? marke(h) : {};
    return `<button class="pk pkb ${h === sp.aktiv ? 'an' : ''} ${m.g ? 'pk-god' : ''} ${/Enhanced/i.test(p.k || '') ? 'pk-enh' : ''} ${wahl?.h === h && wahl?.s === sp.s ? 'wahl' : ''}" data-s="${sp.s}" data-h="${h}" aria-label="${esc(p.n)}" style="background-image:url(${BILD}${p.i})">${m.e ? '<u class="pk-e">E</u>' : ''}${m.v ? '<u class="pk-v">P</u>' : ''}</button>`;
  };
  const perkTeil = () => { const l = spalten.filter((sp) => sp.perk); return l.length ? `<div class="pkraster gross">${l.map((sp) => `<div class="pkspalte"><small>${esc(sp.art)}</small>${sp.plugs.map((h) => knopf(sp, h)).join('')}</div>`).join('')}</div>` : ''; };
  const modTeil = () => { const l = spalten.filter((sp) => !sp.perk); return l.length ? `<div class="dx-mods">${l.map((sp) => { const auf = offen === sp.s; const viele = sp.plugs.length > 1; return `<div class="dx-mod ${auf ? 'auf' : ''}"><small>${esc(sp.art)}</small><div>${auf ? sp.plugs.map((h) => knopf(sp, h)).join('') : knopf(sp, sp.aktiv)}${viele ? `<button class="mehr" data-mehr="${sp.s}" data-tip="${auf ? 'Collapse' : `Show all ${sp.plugs.length} options for this slot`}">${auf ? 'Less' : `+${sp.plugs.length - 1}`}</button>` : ''}</div></div>`; }).join('')}</div>` : ''; };
  // Lesefeld: zeigt den Perk unter der Maus (oder den angeklickten) – feste Höhe, damit nichts springt.
  const leseFeld = () => {
    const z = zeig || wahl;
    if (!z) return `<div class="dx-lese leer"><span><span class="t-maus">Move the mouse over a perk or mod to read it. Click it to select, then “Apply” switches to it in the game.</span><span class="t-touch">Tap a perk or mod to read it, then “Apply” to switch to it.</span></span></div>`;
    const p = defs.items[z.h]; const sp = spalten.find((x) => x.s === z.s); const m = marke && sp?.perk ? marke(z.h) : {};
    const aktiv = sp?.aktiv === z.h; const gewaehlt = wahl && wahl.h === z.h && wahl.s === z.s;
    return `<div class="dx-lese"><div><b>${esc(p.n)}</b><small>${esc(p.k || '')}${m.g ? ' · god roll perk' : ''}${m.e ? ' · PvE pick' : ''}${m.v ? ' · PvP pick' : ''}</small><p>${esc(p.d || 'No description.')}</p></div>
      ${aktiv ? '<em>Active</em>' : gewaehlt && sp.plugs.length > 1 ? '<button data-a="setz" class="haupt-knopf">Apply</button>' : sp?.plugs.length > 1 ? '<em class="matt">click to select</em>' : ''}</div>`;
  };
  const statTeil = () => {
    if (it.d.t === 2 && it.st) return `<div class="dx-stats">${['Health', 'Melee', 'Grenade', 'Super', 'Class', 'Weapons'].map((n) => `<div data-tip="${esc(`<b>${n}</b><br>${STAT_INFO[n] || ''}`)}"><span>${n}</span><i><b style="width:${Math.min(100, (it.st[n] || 0) / 0.45)}%"></b></i><em>${it.st[n] || 0}</em></div>`).join('')}<div class="summe"><span>Total</span><i></i><em>${it.st.Total}</em></div></div>`;
    const l = statRoh.map((s) => ({ n: defs.stats?.[s.statHash]?.n, v: s.value })).filter((s) => s.n && s.v);
    return l.length ? `<div class="dx-stats">${l.map((s) => { const zahl = /Rounds Per Minute|Magazine|Charge Time|Draw Time/.test(s.n); return `<div ${STAT_INFO[s.n] ? `data-tip="${esc(`<b>${s.n}</b><br>${STAT_INFO[s.n]}`)}"` : ''}><span>${esc(s.n)}</span><i>${zahl ? '' : `<b style="width:${Math.min(100, s.v)}%"></b>`}</i><em>${s.v}</em></div>`; }).join('')}</div>` : '';
  };
  // Andere Kopien: komplette Perk-Spalten zum Vergleichen, Urteil, Verschieben, Sperren, Öffnen.
  const kopien = () => {
    const alle = alleItems().filter((x) => x.d.n === it.d.n && x.id !== it.id);
    if (!alle.length) return '';
    const zeile = (x) => {
      const rw = x.d.t === 3 && x.d.q !== 6 ? rollWert(x.hash, x.plugs, alleOptionen(x, profil)) : null;
      const ub = UBK[x.urteil?.art];
      return `<div class="dx-kopie"><div class="dx-kkopf"><b>${x.power || ''}</b>${x.tier ? `<span data-tip="Gear tier ${x.tier} of 5. Higher tiers have more perk options and enhanced perks.">T${x.tier}</span>` : ''}<span>${esc(ortText(x))}</span>${x.locked ? '<span data-tip="Locked in the game">🔒</span>' : ''}${x.kills ? `<span data-tip="Kill tracker on this copy">${x.kills.toLocaleString()} kills</span>` : ''}${ub ? `<i class="ub ub-${x.urteil.art}" data-tip="${esc(x.urteil.grund)}">${ub}</i>` : ''}${rw ? rollBalken(rw) : ''}${x.st ? `<span>Total ${x.st.Total}</span>` : ''}</div>
        ${x.d.t === 3 ? perkRaster(x, profil, { klein: true }) : x.st ? `<div class="dx-kst">${['Health', 'Melee', 'Grenade', 'Super', 'Class', 'Weapons'].map((n) => `<span class="${x.st[n] > (it.st?.[n] || 0) ? 'mehr' : x.st[n] < (it.st?.[n] || 0) ? 'wen' : ''}" data-tip="${n}: this copy ${x.st[n]}, the open one ${it.st?.[n] ?? '–'}"><small>${n.slice(0, 3)}</small>${x.st[n]}</span>`).join('')}</div>` : ''}
        <div class="dx-kakt"><button data-oeffne="${x.id}" data-tip="Open this copy here">Open</button>${x.ort !== 'tresor' ? `<button data-kzu="${x.id}|tresor" data-tip="Send this copy to the vault">→ Vault</button>` : ''}${chars.filter((c) => c.characterId !== x.ort && !x.ort.endsWith(c.characterId)).map((c) => `<button data-kzu="${x.id}|${c.characterId}" data-tip="Move this copy to your ${KLASSE[c.classType]}">→ ${KLASSE[c.classType]}</button>`).join('')}<button data-lock="${x.id}" aria-pressed="${x.locked}" data-tip="${x.locked ? 'Unlock' : 'Lock'} this copy in the game">${x.locked ? '🔒' : '🔓'}</button></div></div>`;
    };
    return `<section class="dx-kopien"><h3>Your other copies <small>${alle.length} · hover any perk to read it · bright = active</small></h3>${alle.sort((a, b) => (b.tier || 0) - (a.tier || 0) || b.power - a.power).map(zeile).join('')}</section>`;
  };
  const chips = () => [it.d.t === 3 && ELEM[it.element] ? [ELEM[it.element], 'Damage type'] : null, it.m.frame ? [it.m.frame, 'Weapon frame (archetype): decides fire rate and base stats'] : null, it.m.champ ? [`Stuns ${it.m.champ}`, 'Can stun this champion type'] : null,
    it.tier ? [`Tier ${it.tier}`, 'Gear tier 1–5. Higher tiers roll more perks; Tier 5 has enhanced perks'] : null, it.m.set ? [it.m.set, 'Armor set – 2 and 4 pieces give set bonuses'] : null, it.crafted ? ['Crafted', 'Shaped at the Relic – perks can be re-chosen'] : null, it.mw ? ['Masterworked', 'Fully masterworked'] : null,
    it.kills ? [`${it.kills.toLocaleString()} kills`, 'Kill tracker on this weapon'] : null, it.genutzt && !it.angelegt ? ['In a loadout', 'Used by one of your in-game loadouts'] : null].filter(Boolean).map(([t, tip]) => `<span data-tip="${esc(tip)}">${esc(t)}</span>`).join('');

  const zeichne = () => {
    const m = document.querySelector('#meldung');
    const sy = d.scrollTop;
    const rw = it.d.t === 3 && it.d.q !== 6 ? rollWert(it.hash, it.plugs, spalten.filter((sp) => sp.perk).flatMap((sp) => sp.plugs)) : null;
    d.innerHTML = `<div class="dx">
      <header class="dx-kopf q${it.d.q}"><i class="dx-bild" style="background-image:url(${BILD}${it.d.i})"></i>
        <div class="dx-titel"><h2>${esc(it.d.n)}</h2><small>${esc(it.d.k)}${it.power ? ` · ${it.power}` : ''} · ${esc(ortText())}</small><div class="dx-chips">${chips()}</div></div>
        <button class="zu" data-a="schliessen" aria-label="Close">✕</button></header>
      ${urteilZeile(it)}
      <div class="dx-aktionen">${knoepfe()}</div>
      <div class="dtags">${TAGS.map(([t, e, n]) => `<button data-tag="${t}" class="dtag ${tags()[it.id] === t ? 'an' : ''}" data-tip="${esc({ fav: 'Your favorite – never suggested for clean-up.', keep: 'Keep – never suggested for clean-up.', junk: 'Mark as junk – shows the JUNK label on the tile.', futter: 'Infusion fodder – shows the FUEL label on the tile.' }[t] || n)} Search: tag:${t}">${e} <span>${n}</span></button>`).join('')}<input class="dnotiz" data-notiz placeholder="📝 Note (searchable with note:)" value="${esc(notizen()[it.id] || '')}" maxlength="120"></div>
      <div class="dx-koerper"><section class="dx-perks">
          <div class="dx-ph"><h3>Perks</h3>${rw ? rollBalken(rw) : ''}</div>
          ${perkTeil() || (it.d.t === 3 ? '<p class="leer klein">No selectable perks.</p>' : '')}${marke ? PERK_LEGENDE : ''}
          ${leseFeld()}
          ${modTeil()}
          ${it.d.xd ? `<p class="tt"><b class="tgold">${esc(it.d.xp || 'Exotic perk')}</b> ${esc(it.d.xd)}</p>` : ''}
          ${it.d.e && defs.sets?.[it.d.e] ? `<div class="tset"><b>${esc(defs.sets[it.d.e].n)}</b>${defs.sets[it.d.e].p.map((p) => `<span><em>${p.c}-piece · ${esc(p.n)}</em> ${esc(p.d)}</span>`).join('')}</div>` : ''}
        </section><section class="dx-werte"><h3>Stats</h3>${statTeil() || '<p class="leer klein">No stats.</p>'}</section></div>
      ${kopien()}</div>`;
    if (d.open) d.append(m);
    d.scrollTop = sy;
    d.querySelectorAll('button').forEach((x) => { x.disabled = beschaeftigt && x.dataset.a !== 'schliessen'; });
  };
  zeichne();
  if (!d.open) { d.showModal(); d.append(document.querySelector('#meldung')); }
  d.scrollTop = 0;
  // Nur wenn das Profil die Perk-Auswahl nicht mitgebracht hat: einmal nachholen (Platz ist schon reserviert).
  if (!pMoegl || !pSock) bungie.item(k, it.id).then((r) => {
    spalten = baue(r.sockets?.data?.sockets, r.reusablePlugs?.data?.plugs || {});
    if (r.stats?.data?.stats) statRoh = Object.values(r.stats.data.stats);
    if (d.open) zeichne();
  }).catch(() => {});

  // Item an Ziel bringen: Postmaster → Charakter → Tresor → anderer Charakter.
  async function bringe(ziel, x = it) {
    let ort = x.ort;
    if (ort.startsWith('post:')) { ort = ort.slice(5); await bungie.abholen(k, x, ort); x.ort = ort; }
    if (ort === ziel) return;
    if (ort !== 'tresor') {
      if (x.angelegt) { const { ersatzAnlegen } = await import('./vault.js'); await ersatzAnlegen(zustand, x); }
      await bungie.verschiebe(k, x, ort, true); x.ort = 'tresor';
    }
    if (ziel !== 'tresor') { const { zumCharakter } = await import('./vault.js'); await zumCharakter(zustand, x, ziel, new Set([x.id])); x.ort = ziel; }
  }
  const melde = (text, fehler) => import('./app.js').then((m) => m.meldung(text, fehler));
  async function fuehreAus(a, cid, x = it) {
    beschaeftigt = true; zeichne();
    try {
      if (a === 'hol') { await bringe(x.ort.slice(5), x); melde('Pulled from Postmaster.'); }
      if (a === 'zu') { await bringe(cid, x); melde(`Moved to ${name(cid)}.`); }
      if (a === 'tresor') { await bringe('tresor', x); melde('Moved to Vault.'); }
      if (a === 'an') {
        const vorher = sammle(profil).filter((y) => y.ort === cid && y.angelegt && y.d.b === it.d.b && y.id !== it.id);
        await bringe(cid);
        await bungie.ausruesten(k, it, cid);
        for (const y of vorher) merkeAenderung(y.id, { ort: cid, angelegt: false });
        it.angelegt = true;
        melde(`Equipped on ${name(cid)}.`);
      }
      if (a === 'setz') {
        const cid2 = it.ort.startsWith('post:') ? it.ort.slice(5) : it.ort === 'tresor' ? chars[0].characterId : it.ort;
        await bungie.plugSetzen(k, it, cid2, wahl.s, wahl.h);
        const sp = spalten.find((y) => y.s === wahl.s);
        it.plugs = it.plugs.map((p) => (p === sp.aktiv ? wahl.h : p));
        if (it.sockel) it.sockel[sp.s] = wahl.h;
        const ps = profil.itemComponents?.sockets?.data?.[it.id]?.sockets?.[sp.s]; if (ps) ps.plugHash = wahl.h;
        sp.aktiv = wahl.h;
        melde(`${defs.items[wahl.h].n} applied.`);
      }
    } catch (e) {
      melde(e.message, true);
    } finally {
      merkeAenderung(x.id, { ort: x.ort, angelegt: x.angelegt });
      beschaeftigt = false; zeichne(); neuZeichnen();
    }
  }
  d.onchange = (e) => { if (e.target.matches('[data-notiz]')) { setzeNotiz(it.id, e.target.value.trim()); neuZeichnen?.(); } };
  // Perk unter der Maus sofort im Lesefeld zeigen (nur das Lesefeld wird ersetzt, das Raster bleibt stehen).
  d.onpointerover = (e) => {
    if (e.pointerType !== 'mouse') return;
    const b = e.target.closest('.pkb'); if (!b || beschaeftigt) return;
    const n = { s: Number(b.dataset.s), h: Number(b.dataset.h) };
    if (zeig && zeig.s === n.s && zeig.h === n.h) return;
    zeig = n; const alt = d.querySelector('.dx-lese'); if (alt) alt.outerHTML = leseFeld();
  };
  d.onclick = (e) => {
    if (e.target === d) return d.close();
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.a === 'schliessen') return d.close();
    if (b.dataset.tag) { setzeTag(it.id, b.dataset.tag); neuZeichnen?.(); zeichne(); return; }
    if (b.dataset.mehr) { offen = offen === Number(b.dataset.mehr) ? null : Number(b.dataset.mehr); return zeichne(); }
    if (b.dataset.h) { wahl = { s: Number(b.dataset.s), h: Number(b.dataset.h) }; zeig = wahl; return zeichne(); }
    if (b.dataset.oeffne) { const x = alleItems().find((y) => y.id === b.dataset.oeffne); if (x) return oeffneDetail(x, zustand, neuZeichnen); }
    if (b.dataset.kzu) { const [id, ziel] = b.dataset.kzu.split('|'); const x = alleItems().find((y) => y.id === id); if (x) fuehreAus(ziel === 'tresor' ? 'tresor' : 'zu', ziel, x); return; }
    if (b.dataset.lock) {
      const x = b.dataset.lock === it.id ? it : alleItems().find((y) => y.id === b.dataset.lock);
      const cid = x.ort === 'tresor' || x.ort.startsWith('post:') ? chars[0].characterId : x.ort;
      bungie.post('/Destiny2/Actions/Items/SetLockState/', { state: !x.locked, itemId: x.id, characterId: cid, membershipType: k.membershipType })
        .then(() => { x.locked = !x.locked; zeichne(); }).catch((err) => import('./app.js').then((mm) => mm.meldung(err.message, true)));
      return;
    }
    if (b.dataset.a) fuehreAus(b.dataset.a, b.dataset.c);
  };
}
