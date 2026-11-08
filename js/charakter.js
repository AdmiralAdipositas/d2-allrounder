// Inventar (Startseite): Hüter, Waffen und Rüstung in einer Ansicht.
// Breiter Bildschirm: alle Charaktere nebeneinander + Tresor. Handy: aktiver Charakter groß, die anderen als schmale Streifen
// (beim Ziehen klappt der Streifen unter dem Finger auf), Tresor darunter.
// Klick auf Waffe/Rüstung öffnet die Detailansicht (Anlegen, Verschieben, Sperren).
import { defs } from './defs.js';
import { sammle, ARMOR_STATS, merkeAenderung, zumCharakter, ersatzAnlegen } from './vault.js';
import * as bungie from './bungie.js';
import { meldung } from './app.js';
import { oeffneDetail } from './detail.js';
import { zeigeItemTipp } from './itemtipp.js';

const BILD = 'https://www.bungie.net';
const KLASSE = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
const RASSE = { 0: 'Human', 1: 'Awoken', 2: 'Exo' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const WAFFEN = [[1498876634, 'Kinetic'], [2465295065, 'Energy'], [953998645, 'Power']];
const RUESTUNG = [[3448274439, 'Helmet'], [3551918588, 'Arms'], [14239492, 'Chest'], [20886954, 'Legs'], [1585787867, 'Class Item']];
const SONST = [[3284755031, 'Subclass'], [4023194814, 'Ghost'], [2025709351, 'Sparrow'], [284967655, 'Ship'], [4274335291, 'Emblem']];
const ENGRAMME = 375726501, POST = 215593132;
const ELEMENT = { 1: 'kinetic', 2: 'arc', 3: 'solar', 4: 'void', 6: 'stasis', 7: 'strand' };

let wahl = null, bereich = 'waffen', suche = '';
try { wahl = localStorage.getItem('d2a.charWahl'); bereich = localStorage.getItem('d2a.invBereich') || 'waffen'; } catch {}
const BEREICHE = [['waffen', 'Weapons'], ['ruestung', 'Armor'], ['sonst', 'General'], ['alle', 'All']];

export function zeigeCharakter(haupt, zustand) {
  const p = zustand.profil;
  const chars = Object.values(p.characters?.data || {}).sort((a, b) => new Date(b.dateLastPlayed) - new Date(a.dateLastPlayed));
  if (!chars.length) { haupt.innerHTML = '<p class="leer">No characters found.</p>'; return; }
  if (!chars.some((c) => c.characterId === wahl)) wahl = chars[0].characterId;
  const inst = p.itemComponents?.instances?.data || {};
  let items = [], proId = new Map();
  let laeuft = false;

  const zeichne = () => {
    // Waffen und Rüstung kommen aus der Item-Liste mit deinen letzten Änderungen, damit Verschobenes sofort umzieht.
    items = sammle(p); proId = new Map(items.map((x) => [x.id, x]));
    const alsRoh = (x) => ({ itemHash: x.hash, itemInstanceId: x.id, bucketHash: x.d.b, quantity: 1 });
    const gear = new Set(items.map((x) => x.d.b));
    const q = suche.trim().toLowerCase();
    const anVon = (cid) => [...(p.characterEquipment?.data?.[cid]?.items || []).filter((i) => !gear.has(i.bucketHash)), ...items.filter((x) => x.ort === cid && x.angelegt).map(alsRoh)];
    const invVon = (cid) => [...(p.characterInventories?.data?.[cid]?.items || []).filter((i) => !gear.has(i.bucketHash) || i.bucketHash === POST), ...items.filter((x) => x.ort === cid && !x.angelegt).map(alsRoh)];
    const kachel = (i, gross) => {
      const d = defs.items[i.itemHash];
      if (!d) return `<span class="ck leer-k ${gross ? 'gross' : ''}" title="Unknown item"></span>`;
      const x = proId.get(i.itemInstanceId);
      const power = inst[i.itemInstanceId]?.primaryStat?.value;
      const el = ELEMENT[inst[i.itemInstanceId]?.damageType] || '';
      const klick = x ? `data-cid="${i.itemInstanceId}"` : '';
      const dim = q && !d.n.toLowerCase().includes(q) && !(d.k || '').toLowerCase().includes(q);
      return `<button class="ck ${gross ? 'gross' : ''} ${d.q === 6 ? 'exo' : ''} ${x?.mw ? 'mw' : ''} ${dim ? 'dim' : ''}" ${klick} data-ih="${i.itemHash}" aria-label="${esc(d.n)}" style="background-image:url(${BILD}${d.i})">${power ? `<em class="${el}">${power}</em>` : ''}${i.quantity > 1 ? `<em>${i.quantity}</em>` : ''}${x?.locked ? '<i class="ck-lock">🔒</i>' : ''}</button>`;
    };
    const reihen = bereich === 'waffen' ? WAFFEN : bereich === 'ruestung' ? RUESTUNG : bereich === 'sonst' ? SONST : [...WAFFEN, ...RUESTUNG, ...SONST];
    const reihe = (cid, an, inv) => ([b, name]) => {
      const e = an.find((i) => i.bucketHash === b);
      const rest = inv.filter((i) => i.bucketHash === b);
      const max = b === 3284755031 ? rest.length : 9;
      return `<div class="creihe" data-bucket="${b}" data-cfor="${cid}"><small>${name}</small><div class="cr-in">${e ? kachel(e, true) : '<span class="ck gross leer-k"></span>'}<div class="cgitter">${rest.map((i) => kachel(i)).join('')}${Array(Math.max(0, max - rest.length)).fill('<span class="ck leer-k"></span>').join('')}</div></div> ${b !== 3284755031 && rest.length >= max ? '<b class="cvoll" title="Full: the app makes room automatically when it moves something here">full</b>' : ''}</div>`;
    };
    const kopfVon = (x) => `<div class="ckopf" style="background-image:url(${BILD}${x.emblemBackgroundPath || ''})"><b>${KLASSE[x.classType]}</b><em>✦ ${x.light}</em></div>`;
    const spalte = (x) => { const an = anVon(x.characterId), inv = invVon(x.characterId); return `<section class="cspalte ${x.characterId === wahl ? 'an' : ''}" data-ziel="${x.characterId}">${kopfVon(x)}${reihen.map(reihe(x.characterId, an, inv)).join('')}</section>`; };
    // Schmaler Streifen (Handy): Emblem + angelegte Teile; beim Ziehen klappt er auf.
    const streifen = (x) => { const an = anVon(x.characterId); return `<section class="cstreifen" data-ziel="${x.characterId}" data-wahl="${x.characterId}" style="--emb:url(${BILD}${x.emblemPath || x.emblemBackgroundPath || ''})"><span class="cs-kopf"><i></i><b>${KLASSE[x.classType][0]}</b></span>${reihen.map(([b]) => { const e = an.find((i) => i.bucketHash === b); return `<span class="cs-slot">${e ? kachel(e) : '<span class="ck leer-k"></span>'}</span>`; }).join('')}</section>`; };
    const tresorItems = items.filter((x) => x.ort === 'tresor' && reihen.some(([b]) => b === x.d.b));
    const tresor = `<section class="ctresorbox" data-ziel="tresor"><div class="ckopf tres"><b>Vault</b><em>${tresorItems.length} shown</em></div>${reihen.filter(([b]) => tresorItems.some((x) => x.d.b === b)).map(([b, name]) => { const l = tresorItems.filter((x) => x.d.b === b).sort((a, c) => (c.d.q === 6) - (a.d.q === 6) || (a.d.c - c.d.c) || a.d.n.localeCompare(c.d.n)); return `<div class="treihe"><small>${name} <span>${l.length}</span></small><div class="cgitter breit">${l.map((x) => kachel(alsRoh(x))).join('')}</div></div>`; }).join('') || '<p class="leer klein">Nothing of this kind in the vault.</p>'}</section>`;
    const c = chars.find((x) => x.characterId === wahl);
    const an = anVon(wahl), inv = invVon(wahl);
    const engr = inv.filter((i) => i.bucketHash === ENGRAMME);
    const post = inv.filter((i) => i.bucketHash === POST);
    const breit = (haupt.clientWidth || innerWidth) >= 980;
    const statsVon = (x) => ARMOR_STATS.map((n) => { const h = Object.keys(defs.stats || {}).find((k) => defs.stats[k].n === n && x.stats?.[k] != null) || Object.keys(defs.stats || {}).find((k) => defs.stats[k].n === n); return [n, x.stats?.[h] || 0, defs.stats?.[h]?.i]; });
    haupt.innerHTML = `<div class="kopf"><h1>Inventory</h1></div>
      <div class="cwahl">${chars.map((x) => `<button class="cbanner ${x.characterId === wahl ? 'an' : ''}" data-wahl="${x.characterId}" data-ziel="${x.characterId}" style="background-image:url(${BILD}${x.emblemBackgroundPath || ''})"><span class="cb-kopf"><b>${KLASSE[x.classType]}</b><small>${RASSE[x.raceType] || ''}</small><em>✦ ${x.light}</em></span><span class="cb-stats">${statsVon(x).map(([n, v, ic]) => `<span title="${n}: ${v}">${ic ? `<i style="background-image:url(${BILD}${ic})"></i>` : `<small>${n.slice(0, 3)}</small>`}<b>${v}</b></span>`).join('')}</span></button>`).join('')}</div>
      <div class="invleiste"><div class="wsub">${BEREICHE.map(([k, t]) => `<button class="chip" data-bereich="${k}" aria-pressed="${k === bereich}">${t}</button>`).join('')}</div><input id="invSuche" type="search" placeholder="Highlight: name or type…" value="${esc(suche)}" aria-label="Highlight items"><span class="invlinks"><button class="chip" data-tabweiter="vault">Weapon list & filters</button><button class="chip" data-tabweiter="armor">Armor list & stats</button></span></div>
      ${breit
        ? `<div class="inv inv-alle" style="--n:${chars.length}">${chars.map(spalte).join('')}${tresor}</div>`
        : `<div class="inv inv-fokus">${spalte(c)}<div class="cstreifen-box">${chars.filter((x) => x.characterId !== wahl).map(streifen).join('')}</div></div>${tresor}`}
      <div class="cgrid unten"><section class="ckarte"><h3>Engrams <small>${KLASSE[c.classType]} · ${engr.length} / 10</small></h3><div class="cgitter breit">${engr.map((i) => kachel(i)).join('')}${Array(Math.max(0, 10 - engr.length)).fill('<span class="ck leer-k"></span>').join('')}</div></section>
        <section class="ckarte"><h3>Postmaster <small>${post.length} / 21</small></h3>${post.length ? `<div class="cgitter breit">${post.map((i) => kachel(i)).join('')}</div><button class="chip" data-postpanel>Open Postmaster</button>` : '<p class="leer klein">Empty.</p>'}</section></div>
      <p class="leer klein">Drag any weapon or armor piece onto another guardian, the vault, or a guardian's equipped slot to move or equip it. Phone: hold an item, then drag; the narrow guardian strips open under your finger. Click for details.</p>`;
    const si = haupt.querySelector('#invSuche');
    si?.addEventListener('input', () => { suche = si.value; const pos = si.selectionStart; zeichne(); const n = haupt.querySelector('#invSuche'); n.focus(); n.setSelectionRange(pos, pos); });
  };
  zeichne();
  // Breite ändert sich (Fenster, Seitenpanel): Layout neu wählen.
  let breitWar = (haupt.clientWidth || innerWidth) >= 980;
  if (window.__d2aInvResize) removeEventListener('resize', window.__d2aInvResize);
  window.__d2aInvResize = () => { const b = (haupt.clientWidth || innerWidth) >= 980; if (b !== breitWar && haupt.querySelector('.inv')) { breitWar = b; zeichne(); } };
  addEventListener('resize', window.__d2aInvResize);

  // Verschieben: Tresor, anderer Hüter, oder auf das angelegte Teil dieses Hüters = anlegen.
  async function bewege(x, ziel) {
    if (laeuft) return; laeuft = true;
    const k = zustand.konto;
    try {
      let ort = x.ort;
      if (ziel.startsWith('anlegen')) {
        const cid = ziel.split(':')[1] || wahl;
        if (ort !== cid) { meldung(`Moving ${x.d.n}…`); if (ort.startsWith('post:')) { ort = ort.slice(5); await bungie.abholen(k, x, ort); } if (ort !== 'tresor' && ort !== cid) { await ersatzAnlegen(zustand, x); await bungie.verschiebe(k, x, ort, true); } if (ort !== cid) await zumCharakter(zustand, x, cid, new Set([x.id])); }
        await bungie.ausruesten(k, x, cid);
        for (const y of items) if (y.ort === cid && y.angelegt && y.d.b === x.d.b && y.id !== x.id) merkeAenderung(y.id, { ort: cid, angelegt: false });
        merkeAenderung(x.id, { ort: cid, angelegt: true });
        meldung(`${x.d.n} equipped.`);
      } else {
        if (ort === ziel) { laeuft = false; return; }
        await ersatzAnlegen(zustand, x);
        meldung(`Moving ${x.d.n}…`);
        if (ort.startsWith('post:')) { ort = ort.slice(5); await bungie.abholen(k, x, ort); }
        if (ort !== 'tresor') await bungie.verschiebe(k, x, ort, true);
        if (ziel !== 'tresor') await zumCharakter(zustand, x, ziel, new Set([x.id]));
        merkeAenderung(x.id, { ort: ziel, angelegt: false });
        meldung(`${x.d.n} → ${ziel === 'tresor' ? 'vault' : KLASSE[chars.find((c) => c.characterId === ziel)?.classType]}.`);
      }
      zustand.alleItems = null;
    } catch (e) { meldung(e.message, true); }
    laeuft = false; zeichne();
  }

  // Ziehen mit Maus und Finger (Pointer Events). Maus: ab 6 px Bewegung. Finger: erst 300 ms halten, dann ziehen.
  let zug = null;
  const zielUnter = (x, y) => {
    const el = document.elementFromPoint(x, y);
    const r = el?.closest('.creihe'); const gross = el?.closest('.ck.gross');
    if (r && gross && Number(r.dataset.bucket) === zug?.x.d.b) return `anlegen:${r.dataset.cfor}`;
    const z = el?.closest('[data-ziel]'); return z ? z.dataset.ziel : null;
  };
  const markiere = (z) => {
    haupt.querySelectorAll('[data-ziel],.ck.gross').forEach((e) => e.classList.toggle('drop-an', Boolean(z) && (e.dataset.ziel === z || (z?.startsWith('anlegen') && e.classList.contains('gross') && `anlegen:${e.closest('.creihe')?.dataset.cfor}` === z && Number(e.closest('.creihe')?.dataset.bucket) === zug?.x.d.b))));
    haupt.querySelectorAll('.cstreifen').forEach((e) => e.classList.toggle('auf', Boolean(z) && e.dataset.ziel === z));
  };
  const starte = (cx, cy) => {
    zug.aktiv = true; document.body.classList.add('zieht'); const tp = document.querySelector('#tipp'); if (tp) tp.hidden = true;
    zug.geist = zug.t.cloneNode(true); zug.geist.classList.add('geist'); document.body.append(zug.geist);
    zug.t.classList.add('quelle'); bewegeGeist(cx, cy);
    // Ablage-Leiste, die beim Ziehen immer sichtbar ist (egal wie weit gescrollt).
    const dock = document.createElement('div'); dock.className = 'cdock';
    dock.innerHTML = `<div class="cd-ziel" data-ziel="tresor"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="13" width="8" height="7" rx="1"/><rect x="13" y="13" width="8" height="7" rx="1"/><rect x="8" y="5" width="8" height="7" rx="1"/></svg><b>Vault</b></div>${chars.filter((c) => c.characterId !== wahl).map((c) => `<div class="cd-ziel" data-ziel="${c.characterId}" style="background-image:url(${BILD}${c.emblemBackgroundPath || ''})"><b>${KLASSE[c.classType]}</b></div>`).join('')}`;
    document.body.append(dock); zug.dock = dock;
  };
  const markiereDock = (z) => zug?.dock?.querySelectorAll('[data-ziel]').forEach((e) => e.classList.toggle('drop-an', e.dataset.ziel === z));
  const bewegeGeist = (cx, cy) => {
    zug.geist.style.left = `${cx - 24}px`; zug.geist.style.top = `${cy - 24}px`; const z = zielUnter(cx, cy); markiere(z); markiereDock(z);
    // Am Rand automatisch scrollen.
    clearInterval(zug.scroll); const rand = 70;
    if (cy < rand || cy > innerHeight - rand) { const dy = cy < rand ? -14 : 14; zug.scroll = setInterval(() => scrollBy(0, dy), 16); }
  };
  const beginne = (t, cx, cy, finger) => {
    const x = proId.get(t.dataset.cid); if (!x) return;
    zug = { x, t, sx: cx, sy: cy, aktiv: false, finger };
    if (finger) zug.timer = setTimeout(() => { if (zug && !zug.aktiv) { starte(zug.sx, zug.sy); navigator.vibrate?.(15); } }, 300);
  };
  const ziehe = (cx, cy, ev) => {
    if (!zug) return;
    if (!zug.aktiv) { const weit = Math.hypot(cx - zug.sx, cy - zug.sy) > 6; if (zug.finger) { if (weit) { clearTimeout(zug.timer); zug = null; } return; } if (!weit) return; starte(cx, cy); }
    ev.preventDefault(); bewegeGeist(cx, cy);
  };
  const ende = (cx, cy) => {
    if (!zug) return;
    clearTimeout(zug.timer);
    const war = zug; zug = null;
    if (!war.aktiv) return;
    const z = zielUnter(cx, cy);
    clearInterval(war.scroll); war.dock?.remove(); war.geist.remove(); war.t.classList.remove('quelle'); document.body.classList.remove('zieht'); markiere(null);
    haupt.dataset.keinKlick = '1'; setTimeout(() => delete haupt.dataset.keinKlick, 80);
    if (z) bewege(war.x, z);
  };
  // Maus über Pointer Events, Finger über Touch Events (nur so lässt sich das Scrollen während des Ziehens stoppen).
  haupt.onpointerdown = (e) => { if (e.pointerType !== 'mouse' || e.button > 0) return; const t = e.target.closest('.ck[data-cid]'); if (t) beginne(t, e.clientX, e.clientY, false); };
  haupt.ontouchstart = (e) => { const t = e.target.closest('.ck[data-cid]'); const p0 = e.touches[0]; if (t && e.touches.length === 1) beginne(t, p0.clientX, p0.clientY, true); };
  const h = {
    pm: (e) => { if (zug && !zug.finger) ziehe(e.clientX, e.clientY, e); },
    pu: (e) => { if (zug && !zug.finger) ende(e.clientX, e.clientY); },
    tm: (e) => { if (zug?.finger) { const p0 = e.touches[0]; ziehe(p0.clientX, p0.clientY, e); } },
    tu: (e) => { if (zug?.finger) { const p0 = e.changedTouches[0]; ende(p0.clientX, p0.clientY); } },
  };
  const alt = window.__d2aZiehen;
  if (alt) { removeEventListener('pointermove', alt.pm); removeEventListener('pointerup', alt.pu); removeEventListener('touchmove', alt.tm); removeEventListener('touchend', alt.tu); removeEventListener('touchcancel', alt.tu); }
  window.__d2aZiehen = h;
  addEventListener('pointermove', h.pm); addEventListener('pointerup', h.pu);
  addEventListener('touchmove', h.tm, { passive: false }); addEventListener('touchend', h.tu); addEventListener('touchcancel', h.tu);
  haupt.oncontextmenu = (e) => { if (e.target.closest('.ck[data-cid]') && (zug?.finger || e.pointerType === 'touch')) e.preventDefault(); };

  // In-Game-Hover für Waffen und Rüstung.
  haupt.onpointerover = (e) => { if (e.pointerType !== 'mouse' || zug?.aktiv) return; const t = e.target.closest('.ck[data-cid]'); if (t) zeigeItemTipp(proId.get(t.dataset.cid), p, e.clientX, e.clientY); };
  haupt.onpointerout = (e) => { if (e.target.closest('.ck[data-cid]') && !e.relatedTarget?.closest?.('.ck[data-cid]') && !document.querySelector('#tippFest:checked')) { const tp = document.querySelector('#tipp'); if (tp) tp.hidden = true; } };
  haupt.onclick = (e) => {
    if (haupt.dataset.keinKlick) return;
    { const tp = document.querySelector('#tipp'); if (tp) tp.hidden = true; }
    const br = e.target.closest('[data-bereich]');
    if (br) { bereich = br.dataset.bereich; try { localStorage.setItem('d2a.invBereich', bereich); } catch {} return zeichne(); }
    const tw = e.target.closest('[data-tabweiter]');
    if (tw) { document.querySelector(`#rail [data-tab="${tw.dataset.tabweiter}"]`)?.click(); return; }
    if (e.target.closest('.ck[data-cid]') == null && e.target.closest('.cstreifen')) { const st = e.target.closest('.cstreifen'); wahl = st.dataset.wahl; try { localStorage.setItem('d2a.charWahl', wahl); } catch {} return zeichne(); }
    const w = e.target.closest('[data-wahl]');
    if (w) { wahl = w.dataset.wahl; try { localStorage.setItem('d2a.charWahl', wahl); } catch {} return zeichne(); }
    if (e.target.closest('[data-postpanel]')) return zustand.oeffnePanel?.('post');
    const k = e.target.closest('[data-cid]');
    if (k) { const x = proId.get(k.dataset.cid); if (x) oeffneDetail(x, zustand, () => zeichne()); }
  };
}
