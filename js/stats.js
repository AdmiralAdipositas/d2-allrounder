// Statistiken à la raid.report / dungeon.report / guardian.report: alles aus Bungies Spielverlauf, auf Wunsch sehr tief (aufklappbar).
// Quellen: Account-Stats (alle Charaktere inkl. gelöschter), Aktivitätsverlauf, Spielberichte (PGCR, im Browser gecacht),
// Triumphe/Siegel, Kill-Tracker auf eigenen Waffen. Andere Spieler per Bungie-Name ansehen.
import * as bungie from './bungie.js';
import { defs } from './defs.js';
import { CHALLENGES } from './challenges.js';

const BILD = 'https://www.bungie.net';
const TAGE = 14;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const wert = (o, k) => o?.[k]?.basic?.value ?? 0;
const zahl = (n) => Math.round(n || 0).toLocaleString();
const stunden = (s) => `${zahl(s / 3600)} h`;
const dauer = (s) => { s = Math.round(s || 0); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`; };
const zeitText = (ms) => (ms ? dauer(ms / 1000) : '–');
const datum = (t) => (t ? new Date(t).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '–');
const vor = (t) => { if (!t) return ''; const d = Math.floor((Date.now() - new Date(t)) / 86400_000); return d < 1 ? 'today' : d === 1 ? 'yesterday' : d < 60 ? `${d} days ago` : `${Math.floor(d / 30)} months ago`; };

// ---------- Bungies Stat-Namen (für „alles andere“ und Medaillen) ----------
let statDefs = null;
async function ladeStatDefs() { if (!statDefs) statDefs = await bungie.get('/Destiny2/Stats/Definition/').catch(() => ({})); return statDefs; }
const statName = (k) => statDefs?.[k]?.statName || k.replace(/^Medals_pvp_medal_/, '').replace(/^medal/, '').replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');

// ---------- Spielberichte (PGCR): einmal laden, für immer im Browser behalten ----------
const PGCR_KEY = 'd2a.pgcr.v1';
let pgcrCache = null;
const pgcrLies = () => { if (!pgcrCache) { try { pgcrCache = JSON.parse(localStorage.getItem(PGCR_KEY) || '{}'); } catch { pgcrCache = {}; } } return pgcrCache; };
let zuletztGespeichert = 0, speicherT = 0;
const pgcrSpeichern = () => { zuletztGespeichert = Date.now(); try { localStorage.setItem(PGCR_KEY, JSON.stringify(pgcrCache)); } catch {} };
// Spätestens alle 4 s sichern, damit beim Schließen nichts verloren geht.
const pgcrMerke = () => { clearTimeout(speicherT); if (Date.now() - zuletztGespeichert > 4000) pgcrSpeichern(); else speicherT = setTimeout(pgcrSpeichern, 1000); };
// Kurzfassung: von Anfang an (f), Tode gesamt (d), Spieler [Name, Klasse, abgeschlossen].
async function pgcrKurz(id) {
  const c = pgcrLies();
  if (c[id]) return c[id];
  const p = await bungie.pgcr(id);
  const leute = new Map(); let tode = 0;
  for (const e of p.entries || []) {
    const u = e.player?.destinyUserInfo || {};
    const name = u.bungieGlobalDisplayName ? `${u.bungieGlobalDisplayName}#${String(u.bungieGlobalDisplayNameCode || '').padStart(4, '0')}` : u.displayName || '?';
    tode += wert(e.values, 'deaths');
    const alt = leute.get(name);
    leute.set(name, [name, e.player?.characterClass || '', Math.max(alt?.[2] || 0, wert(e.values, 'completed'))]);
  }
  c[id] = { f: p.activityWasStartedFromBeginning ? 1 : 0, d: tode, p: [...leute.values()] };
  pgcrMerke();
  return c[id];
}

// ---------- Daten laden ----------
const caches = new Map();
async function verlaufAlle(k, cid, mode) {
  const out = [];
  for (let page = 0; page < 20; page++) {
    const r = await bungie.get(`/Destiny2/${k.membershipType}/Account/${k.membershipId}/Character/${cid}/Stats/Activities/?mode=${mode}&count=250&page=${page}`).catch(() => null);
    const l = r?.activities || []; out.push(...l);
    if (l.length < 250) break;
  }
  return out;
}
const aktName = (h) => { const d = defs.akt?.[h]; return d ? d.n.split(':')[0].trim().replace(/^The Pantheon$/, 'Pantheon') : ''; };
const istMaster = (h) => /master|epic/i.test(defs.akt?.[h]?.n || '');

async function lade(k, eigenes, zustand) {
  const key = `${k.membershipType}:${k.membershipId}`;
  const c = caches.get(key);
  if (c && Date.now() - c.zeit < 30 * 60_000) return c.daten;
  const basis = `/Destiny2/${k.membershipType}/Account/${k.membershipId}`;
  const [konten] = await Promise.all([bungie.get(`${basis}/Stats/?groups=1,2,3`), ladeStatDefs()]);
  const mg = konten.mergedAllCharacters || {};
  const alle = mg.merged?.allTime || {}, pve = mg.results?.allPvE?.allTime || {}, pvp = mg.results?.allPvP?.allTime || {};
  const chars = konten.characters || [];
  const lebend = chars.filter((x) => !x.deleted).map((x) => x.characterId);
  const aktivitaeten = new Map(), waffen = new Map(), tage = new Map(), laeufe = [];
  const grenze = Date.now() - TAGE * 86400_000;
  await Promise.all(chars.map(async ({ characterId: cid, deleted }) => {
    const [agg, uw, verlauf, raids, dungeons] = await Promise.all([
      bungie.get(`${basis}/Character/${cid}/Stats/AggregateActivityStats/`).catch(() => null),
      deleted ? null : bungie.get(`${basis}/Character/${cid}/Stats/UniqueWeapons/`).catch(() => null),
      deleted ? null : bungie.get(`${basis}/Character/${cid}/Stats/Activities/?count=250&mode=0&page=0`).catch(() => null),
      verlaufAlle(k, cid, 4), verlaufAlle(k, cid, 82),
    ]);
    for (const a of agg?.activities || []) {
      const d = defs.akt?.[a.activityHash]; if (!d) continue;
      const n = aktName(a.activityHash);
      const e = aktivitaeten.get(n) || { n, g: d.g || '', i: d.i, clears: 0, sek: 0, gestartet: 0 };
      e.clears += wert(a.values, 'activityCompletions'); e.sek += wert(a.values, 'activitySecondsPlayed'); e.gestartet += wert(a.values, 'activityCompletions') + wert(a.values, 'activityAbandons' ) ;
      aktivitaeten.set(n, e);
    }
    for (const w of uw?.weapons || []) {
      const it = defs.items[w.referenceId]; if (!it?.n) continue;
      const e = waffen.get(it.n) || { h: w.referenceId, name: it.n, icon: it.i, kills: 0, praez: 0, exotic: it.q === 6, quelle: 'Bungie' };
      e.kills += wert(w.values, 'uniqueWeaponKills'); e.praez += wert(w.values, 'uniqueWeaponPrecisionKills');
      waffen.set(it.n, e);
    }
    for (const a of verlauf?.activities || []) {
      const t = new Date(a.period); if (t.getTime() < grenze) continue;
      const tag = t.toLocaleDateString('sv'); tage.set(tag, (tage.get(tag) || 0) + wert(a.values, 'timePlayedSeconds'));
    }
    for (const [art, l] of [['raid', raids], ['dungeon', dungeons]]) for (const a of l) {
      const h = a.activityDetails?.referenceId; const n = aktName(h); if (!n) continue;
      laeufe.push({ art, n, h, id: a.activityDetails.instanceId, t: a.period, ok: wert(a.values, 'completed') === 1 && wert(a.values, 'completionReason') === 0, sek: wert(a.values, 'activityDurationSeconds'), spieler: wert(a.values, 'playerCount'), tode: wert(a.values, 'deaths'), kills: wert(a.values, 'kills'), master: istMaster(h), cid });
    }
  }));
  // Kill-Tracker auf eigenen Waffen (legendär + exotisch, zählt seit dem Erhalt dieser Kopie).
  if (eigenes) {
    try {
      const p = await bungie.get(`/Destiny2/${k.membershipType}/Profile/${k.membershipId}/?components=102,201,205,309`);
      const obj = p.itemComponents?.plugObjectives?.data || {};
      const items = [...(p.profileInventory?.data?.items || []), ...Object.values(p.characterInventories?.data || {}).flatMap((x) => x.items), ...Object.values(p.characterEquipment?.data || {}).flatMap((x) => x.items)];
      for (const it of items) {
        const d = defs.items[it.itemHash]; if (!d || d.t !== 3 || !it.itemInstanceId) continue;
        let kills = 0;
        for (const l of Object.values(obj[it.itemInstanceId]?.objectivesPerPlug || {})) for (const o of l) if (o.progress > kills && o.completionValue <= 1) kills = o.progress;
        const e = waffen.get(d.n) || { h: it.itemHash, name: d.n, icon: d.i, kills: 0, praez: 0, exotic: d.q === 6, quelle: 'Kill tracker', kopien: 0, tracker: 0 };
        e.kopien = (e.kopien || 0) + 1; e.tracker = (e.tracker || 0) + kills;
        if (e.quelle !== 'Bungie') e.kills = e.tracker;
        waffen.set(d.n, e);
      }
    } catch {}
  }
  // Waffentypen: Bungies „Beam Rifle“ ist ein zweiter Trace-Rifle-Zähler; Fähigkeiten getrennt.
  const typRoh = Object.keys(alle).filter((x) => /^weaponKills/.test(x) && !/Precision/.test(x));
  const typen = new Map();
  for (const x of typRoh) {
    const v = wert(alle, x); if (!v) continue;
    const n = x === 'weaponKillsBeamRifle' ? 'Trace Rifle' : statName(x);
    const faehig = /Grenade$|Melee$|Super$|Ability$/.test(x);
    const e = typen.get(n) || { n, kills: 0, faehig, relikt: /Relic$/.test(x) }; e.kills += v; typen.set(n, e);
  }
  const tagListe = [];
  for (let n = TAGE - 1; n >= 0; n--) { const t = new Date(Date.now() - n * 86400_000); const tag = t.toLocaleDateString('sv'); tagListe.push({ tag, kurz: t.toLocaleDateString([], { weekday: 'short' }), s: tage.get(tag) || 0 }); }
  // Siegel/Triumphe (öffentlich).
  let records = {};
  try {
    const r = await bungie.get(`/Destiny2/${k.membershipType}/Profile/${k.membershipId}/?components=900`);
    records = { ...(r.profileRecords?.data?.records || {}) };
    for (const cr of Object.values(r.characterRecords?.data || {})) for (const [h, v] of Object.entries(cr.records || {})) if (!records[h]) records[h] = v;
  } catch {}
  const daten = { k, alle, pve, pvp, chars, lebend, aktivitaeten: [...aktivitaeten.values()], waffen: [...waffen.values()], typen: [...typen.values()].sort((a, b) => b.kills - a.kills), tage: tagListe, laeufe: laeufe.sort((a, b) => new Date(b.t) - new Date(a.t)), records };
  caches.set(key, { zeit: Date.now(), daten });
  return daten;
}

// ---------- Auswertung Raids/Dungeons ----------
function auswerten(laeufe) {
  const pc = pgcrLies();
  const m = new Map();
  for (const l of laeufe) {
    const e = m.get(l.n) || { n: l.n, art: l.art, h: l.h, clears: 0, voll: 0, cp: 0, master: 0, flawless: 0, solo: 0, soloFl: 0, trio: 0, duo: 0, schnellste: 0, zuletzt: null, sek: 0, laeufe: [], versuche: 0 };
    e.versuche++; e.sek += l.sek;
    if (!e.zuletzt || new Date(l.t) > new Date(e.zuletzt)) e.zuletzt = l.t;
    if (l.ok) {
      const p = pc[l.id];
      e.clears++; if (l.master) e.master++;
      const voll = p ? p.f === 1 : null;
      if (voll === true) { e.voll++; if (!e.schnellste || l.sek < e.schnellste) e.schnellste = l.sek; } else if (voll === false) e.cp++;
      const n = p ? p.p.length : l.spieler;
      const fl = voll && p && p.d === 0;
      if (fl) e.flawless++;
      if (voll && n === 1) { e.solo++; if (fl) e.soloFl++; } else if (voll && n === 2) e.duo++; else if (voll && n === 3) e.trio++;
      e.laeufe.push({ ...l, voll, fl, n, p });
    }
    m.set(l.n, e);
  }
  return [...m.values()].sort((a, b) => b.clears - a.clears);
}
// Siegel zu einem Raid/Dungeon (gleicher Name) und fehlende Challenges.
const sealFuer = (n) => Object.entries(defs.seal || {}).filter(([, s]) => s.n === n).sort((a, b) => /legacy/i.test(a[1].pn) - /legacy/i.test(b[1].pn))[0];
const fertig = (rec, h) => { const r = rec[h]; return Boolean(r) && (r.state & 4) === 0; };

// ---------- Darstellung ----------
const kachel = (titel, gross, klein = '') => `<div class="kpi"><small>${titel}</small><b>${gross}</b>${klein ? `<span>${klein}</span>` : ''}</div>`;
const block = (id, titel, sub, inhalt, offen) => `<details class="sblock" data-blk="${id}" ${offen ? 'open' : ''}><summary><h3>${titel}</h3>${sub ? `<small>${sub}</small>` : ''}</summary>${inhalt}</details>`;
let offenStand = {};
try { offenStand = JSON.parse(localStorage.getItem('d2a.statsOffen') || '{}'); } catch {}
const istOffen = (id, std) => (id in offenStand ? offenStand[id] : std);

function punktTip(l) {
  const team = l.p ? l.p.p.map(([n, c, ok]) => `${esc(n)}${c ? ` · ${esc(c)}` : ''}${ok ? '' : ' (left)'}`).join('<br>') : 'Team loads in the background…';
  return `<b>${esc(datum(l.t))}</b> · ${dauer(l.sek)}<br>${l.voll === null ? 'Checking full / checkpoint…' : l.voll ? 'Full clear' : 'Checkpoint clear'}${l.fl ? ' · <span class=gold>Flawless</span>' : ''}${l.master ? ' · Master/Epic' : ''}<br><small>${team}</small>`;
}
function zeileRaid(e, d) {
  const s = sealFuer(e.n);
  const seal = s ? s[1] : null;
  const sealOk = seal && fertig(d.records, seal.c);
  const recs = seal ? seal.k : [];
  const fehlChal = recs.filter((r) => CHALLENGES[defs.rec?.[r]?.n] && !fertig(d.records, r)).map((r) => defs.rec[r].n);
  const sealTxt = seal ? `${recs.filter((r) => fertig(d.records, r)).length}/${recs.length}` : '';
  const punkte = e.laeufe.slice(0, 120).map((l, i) => `<i class="pkt ${l.voll ? 'voll' : l.voll === false ? 'cp' : ''} ${l.fl ? 'fl' : ''} ${l.master ? 'ms' : ''}" data-tipl="${e.n}|${i}"></i>`).join('');
  return `<details class="rzeile"><summary>
      <span class="rn">${esc(e.n)}${seal ? `<em class="rtitel ${sealOk ? 'ok' : ''}" title="${esc(seal.t)}: ${sealTxt}">${sealOk ? '★' : '☆'} ${esc(seal.t)}</em>` : ''}</span>
      <b title="Full clears + checkpoint clears">${zahl(e.clears)}</b><span>${zahl(e.voll)}<small>full</small></span><span>${zahl(e.master)}<small>master</small></span><span>${zahl(e.flawless)}<small>flawless</small></span>
      ${e.art === 'dungeon' ? `<span>${zahl(e.solo)}<small>solo</small></span><span>${zahl(e.soloFl)}<small>solo fl.</small></span>` : `<span>${zahl(e.trio + e.duo + e.solo)}<small>lowman</small></span>`}
      <span>${zeitText(e.schnellste * 1000)}<small>fastest</small></span><span title="${esc(datum(e.zuletzt))}">${esc(vor(e.zuletzt))}<small>last</small></span></summary>
    <div class="rdetail">
      <p class="leer klein">${zahl(e.clears)} clears (${zahl(e.voll)} full, ${zahl(e.cp)} from a checkpoint${e.clears - e.voll - e.cp > 0 ? `, ${zahl(e.clears - e.voll - e.cp)} still being checked` : ''}) · ${zahl(e.versuche - e.clears)} runs without a clear · ${stunden(e.sek)} in total · last ${esc(datum(e.zuletzt))}.
        ${e.art === 'dungeon' ? `Solo ${zahl(e.solo)} · solo flawless ${zahl(e.soloFl)} · duo ${zahl(e.duo)} · trio ${zahl(e.trio)}.` : `Lowman: trio ${zahl(e.trio)} · duo ${zahl(e.duo)} · solo ${zahl(e.solo)}.`}</p>
      <div class="pkte">${punkte || '<span class="leer klein">No clears yet.</span>'}</div>
      <p class="pleg"><i class="pkt voll"></i>full <i class="pkt cp"></i>checkpoint <i class="pkt voll fl"></i>flawless <i class="pkt voll ms"></i>master/epic · hover or tap a dot for date, time and team</p>
      ${seal ? `<p><b>${esc(seal.t)}</b> ${sealOk ? '<span class="gold">earned</span>' : `· ${sealTxt} triumphs`}${fehlChal.length ? ` · missing challenges: ${fehlChal.map((c) => `<button class="chip klein" data-wikichal="${esc(c)}">${esc(c)}</button>`).join(' ')}` : ''}</p>` : ''}
    </div></details>`;
}
function tabelleLaeufe(titel, liste, d, art) {
  if (!liste.length) return '';
  return `<div class="rkopf ${art}"><span></span><b>Clears</b><span>Full</span><span>Master</span><span>Flawless</span>${art === 'dungeon' ? '<span>Solo</span><span>Solo fl.</span>' : '<span>Lowman</span>'}<span>Fastest</span><span>Last</span></div>${liste.map((e) => zeileRaid(e, d)).join('')}`;
}

// Siegel-Raster: ausgegraut / voll, Hover = was fehlt, Klick = alle Triumphe.
function siegel(d) {
  const proTitel = new Map();
  for (const [h, s] of Object.entries(defs.seal || {})) { const k = s.t || s.n; proTitel.set(k, [...(proTitel.get(k) || []), { h, ...s }]); }
  const liste = [...proTitel.values()].map((vs) => { vs.sort((a, b) => /legacy/i.test(a.pn) - /legacy/i.test(b.pn) || b.k.filter((r) => fertig(d.records, r)).length - a.k.filter((r) => fertig(d.records, r)).length); return vs[0]; })
    .map((s) => { const o = d.records[s.c]?.objectives?.[0]; const ok = fertig(d.records, s.c); const n = o?.completionValue || s.k.length; const done = o ? Math.min(o.progress || 0, n) : s.k.filter((r) => fertig(d.records, r)).length; return { ...s, done: ok ? n : done, n, ok }; })
    .sort((a, b) => b.ok - a.ok || b.done / b.n - a.done / a.n);
  const ok = liste.filter((s) => s.ok).length;
  return { ok, n: liste.length, html: `<div class="srast">${liste.map((s) => `<button class="sseal ${s.ok ? 'ok' : ''}" data-seal="${s.h}" data-tips="${s.h}" style="--anteil:${Math.round((s.done / s.n) * 100)}%"><i style="background-image:url(${BILD}${s.i})"></i><span>${esc(s.t)}</span><small>${s.done}/${s.n}</small></button>`).join('')}</div><div class="sealdetail" hidden></div>` };
}
function sealTip(h, d) {
  const s = defs.seal?.[h]; if (!s) return '';
  const fehlt = fertig(d.records, s.c) ? [] : s.k.filter((r) => !fertig(d.records, r));
  return `<b>${esc(s.t)}</b> · ${esc(s.n)}<br>${fertig(d.records, s.c) ? '<span class=gold>Title earned</span>' : `${s.k.length - fehlt.length}/${s.k.length} done`}${fehlt.length ? `<br><small>Still needed:</small><br>${fehlt.slice(0, 8).map((r) => `○ ${esc(defs.rec?.[r]?.n || '?')}`).join('<br>')}${fehlt.length > 8 ? `<br>… and ${fehlt.length - 8} more` : ''}` : ''}`;
}
function sealDetail(h, d) {
  const s = defs.seal?.[h]; if (!s) return '';
  return `<h4>${esc(s.t)} <small>${esc(s.n)}</small></h4>${s.d ? `<p class="leer klein">${esc(s.d.split('\n')[0])}</p>` : ''}${fertig(d.records, s.c) ? '<p class="gold">Title earned. Older seals no longer track every single triumph, so some may show open.</p>' : ''}<div class="sschritte">${s.k.map((r) => { const ok = fertig(d.records, r) || fertig(d.records, s.c); const st = d.records[r]; const o = st?.objectives || st?.intervalObjectives || []; const z = o.length === 1 && o[0].completionValue > 1 ? `${Math.min(o[0].progress || 0, o[0].completionValue)}/${o[0].completionValue}` : o.length > 1 ? `${o.filter((x) => x.complete).length}/${o.length}` : ''; return `<div class="sschritt ${ok ? 'ok' : ''}"><span class="sh">${ok ? '✓' : '○'}</span><div><b>${esc(defs.rec?.[r]?.n || '?')}</b>${defs.rec?.[r]?.d ? `<small>${esc(defs.rec[r].d)}</small>` : ''}</div>${z && !ok ? `<em>${z}</em>` : ''}</div>`; }).join('')}</div>`;
}

// Lustige, merkwürdige und negative Werte – nur was Bungie wirklich liefert.
function spass(d) {
  const a = d.alle, w = (k) => wert(a, k);
  const zeilen = [];
  const add = (t, v, x) => { if (v || v === 0) zeilen.push([t, v, x || '']); };
  const tode = w('deaths'), zeit = w('secondsPlayed');
  add('Deaths', zahl(tode), tode && zeit ? `one every ${dauer(zeit / tode)} of play` : '');
  add('Suicides', zahl(w('suicides')), w('suicides') ? 'falling, your own rockets, the Vex milk…' : '');
  add('Longest single life', dauer(w('longestSingleLife')));
  add('Average life', dauer(w('averageLifespan')));
  add('Longest kill spree', zahl(w('longestKillSpree')));
  add('Longest kill distance', `${zahl(w('longestKillDistance'))} m`);
  add('Total distance from your killers', `${(w('totalDeathDistance') / 1000).toFixed(1)} km`, 'added up over every death');
  add('Total kill distance', `${(w('totalKillDistance') / 1000).toFixed(1)} km`);
  add('Most kills in one activity', zahl(w('bestSingleGameKills')));
  add('Most precision kills in one activity', zahl(w('mostPrecisionKills')));
  add('Revives given / received', `${zahl(w('resurrectionsPerformed'))} / ${zahl(w('resurrectionsReceived'))}`, w('resurrectionsReceived') > w('resurrectionsPerformed') ? 'you got picked up more than you picked up' : 'the team medic');
  add('Orbs made / picked up', `${zahl(w('orbsDropped'))} / ${zahl(w('orbsGathered'))}`);
  add('Public events (heroic)', `${zahl(w('publicEventsCompleted'))} (${zahl(w('heroicPublicEventsCompleted'))})`);
  add('Adventures', zahl(w('adventuresCompleted')));
  add('Medals earned (PvP)', zahl(w('allMedalsEarned')));
  // Aus dem Aktivitäts-Aggregat: einmal gespielt, nie wieder; meistgespielt.
  const akt = d.aktivitaeten.filter((x) => x.n);
  const einmal = akt.filter((x) => x.clears === 1 && /Exotic|Dungeon|Raid|Story|Mission|Quest/i.test(`${x.g} ${x.n}`)).sort((x, y) => x.n.localeCompare(y.n));
  const meist = akt.slice().sort((x, y) => y.sek - x.sek).slice(0, 8);
  const ohne = akt.filter((x) => x.clears === 0 && x.sek > 1800).sort((x, y) => y.sek - x.sek).slice(0, 10);
  return `<div class="fun">${zeilen.map(([t, v, x]) => `<div><small>${esc(t)}</small><b>${esc(v)}</b>${x ? `<span>${esc(x)}</span>` : ''}</div>`).join('')}</div>
    <div class="zwei"><div><h4>Where your time went</h4>${meist.map((x) => `<div class="tbar"><span>${esc(x.n)}</span><i><b style="width:${(x.sek / Math.max(1, meist[0].sek)) * 100}%"></b></i><em>${stunden(x.sek)}</em></div>`).join('')}</div>
      <div><h4>One and done <small>cleared exactly once, never again</small></h4>${einmal.length ? `<div class="chips">${einmal.slice(0, 40).map((x) => `<span class="chip">${esc(x.n)}</span>`).join('')}</div>` : '<p class="leer klein">Nothing – you finish what you start.</p>'}
      ${ohne.length ? `<h4>Time sinks without a clear</h4>${ohne.map((x) => `<div class="tbar"><span>${esc(x.n)}</span><i><b style="width:${(x.sek / Math.max(1, ohne[0].sek)) * 100}%"></b></i><em>${stunden(x.sek)}</em></div>`).join('')}` : ''}</div></div>
    <p class="leer klein">Not in Bungie's data, so not shown: deaths by cause (e.g. drop pods), longest super, how often each ability was cast.</p>`;
}

const TYP_HILFE = {
  'Ability Kills': 'Kills by abilities that are not grenade, melee or super (class abilities, aspects, fragments and similar).',
  Relics: 'Kills with carried objects such as raid relics and swords you pick up in activities.',
  'Trace Rifle': 'Includes Bungie\'s older “Beam Rifle” counter, which also counts Trace Rifles.',
  Super: 'Kills with your super.', Grenade: 'Grenade kills.', Melee: 'Melee kills.',
};

let fremd = null; // { membershipType, membershipId, name }
let tipDaten = null;

export async function zeigeStats(haupt, zustand) {
  const lauf = (haupt.dataset.lauf = String(Number(haupt.dataset.lauf || 0) + 1));
  const k = fremd || zustand.konto;
  const name = fremd ? fremd.name : 'you';
  haupt.innerHTML = `<h1>Stats</h1><p class="leer">Reading ${fremd ? esc(fremd.name) + '’s' : 'your'} history from Bungie…</p>`;
  let d;
  try { d = await lade(k, !fremd, zustand); } catch (e) { haupt.innerHTML = `<h1>Stats</h1>${suchzeile()}<p class="leer">${esc(e.message)}</p>`; verbinde(haupt, zustand); return; }
  if (haupt.dataset.lauf !== lauf) return;
  const zeichne = () => {
    const ws = auswerten(d.laeufe);
    const raids = ws.filter((e) => e.art === 'raid'), dungeons = ws.filter((e) => e.art === 'dungeon');
    tipDaten = { d, ws };
    const maxTag = Math.max(1, ...d.tage.map((t) => t.s));
    const waffenT = d.typen.filter((t) => !t.faehig), faehig = d.typen.filter((t) => t.faehig);
    const maxTyp = Math.max(1, ...waffenT.map((t) => t.kills));
    const sieg = wert(d.pvp, 'activitiesEntered') ? Math.round((wert(d.pvp, 'activitiesWon') / wert(d.pvp, 'activitiesEntered')) * 100) : 0;
    const killsAlle = wert(d.alle, 'kills');
    const sg = siegel(d);
    const exo = d.waffen.filter((w) => w.exotic).sort((a, b) => b.kills - a.kills);
    const leg = d.waffen.filter((w) => !w.exotic && w.kills > 0).sort((a, b) => b.kills - a.kills);
    const staub = d.waffen.filter((w) => !w.exotic && w.kopien && !w.tracker).slice(0, 24);
    const meist = [...d.waffen].sort((a, b) => b.kills - a.kills)[0];
    const offen = pgcrOffen(d);
    const wkachel = (w) => `<div class="tw ${w.exotic ? 'exo' : ''}"><i data-ih="${w.h}" style="background-image:url(${BILD}${w.icon})"></i><div><b>${esc(w.name)}</b><small>${zahl(w.kills)} kills${w.praez ? ` · ${Math.round((w.praez / Math.max(1, w.kills)) * 100)}% precision` : ''}${w.quelle === 'Kill tracker' ? ' · tracker' : ''}</small></div></div>`;
    haupt.innerHTML = `<div class="kopf"><h1>Stats</h1><span class="platz"></span><small class="leer">${fremd ? `Viewing <b>${esc(fremd.name)}</b> · <button class="chip" data-ich>back to me</button>` : 'All characters, including deleted ones'}</small></div>
      ${suchzeile()}
      <div class="kpis">${kachel('Time played', stunden(wert(d.alle, 'secondsPlayed')), `PvE ${stunden(wert(d.pve, 'secondsPlayed'))} · PvP ${stunden(wert(d.pvp, 'secondsPlayed'))}`)}
        ${kachel('Kills', zahl(killsAlle), `PvE ${zahl(wert(d.pve, 'kills'))} · PvP ${zahl(wert(d.pvp, 'kills'))}`)}
        ${kachel('Deaths', zahl(wert(d.alle, 'deaths')), `K/D ${wert(d.alle, 'killsDeathsRatio').toFixed(2)} · ${Math.round((wert(d.alle, 'precisionKills') / Math.max(1, killsAlle)) * 100)}% precision`)}
        ${kachel('Activities cleared', zahl(wert(d.alle, 'activitiesCleared')), `${zahl(wert(d.alle, 'activitiesEntered'))} entered`)}
        ${kachel('Seals', `${sg.ok}/${sg.n}`, 'titles earned')}
        ${kachel('PvP', `${sieg}% wins`, `K/D ${wert(d.pvp, 'killsDeathsRatio').toFixed(2)} · ${zahl(wert(d.pvp, 'activitiesEntered'))} matches`)}</div>
      ${offen ? `<p class="leer klein pgcrstand">Checking ${zahl(offen)} raid/dungeon reports for full clears, flawless and teams… (saved in this browser, only once)</p>` : ''}
      ${block('seal', 'Seals & titles', `${sg.ok} of ${sg.n} earned · hover for what's missing, click for all triumphs`, sg.html, istOffen('seal', true))}
      ${block('raid', 'Raids', `${zahl(raids.reduce((a, e) => a + e.clears, 0))} clears · click a raid for every run`, tabelleLaeufe('Raids', raids, d, 'raid'), istOffen('raid', true))}
      ${block('dungeon', 'Dungeons', `${zahl(dungeons.reduce((a, e) => a + e.clears, 0))} clears`, tabelleLaeufe('Dungeons', dungeons, d, 'dungeon'), istOffen('dungeon', true))}
      ${block('waffen', 'Weapons', meist ? `most used: ${esc(meist.name)}` : '', `<div class="zwei"><div><h4>Top exotics <small>Bungie counts every kill</small></h4><div class="twaffen">${exo.slice(0, 12).map(wkachel).join('')}</div></div>
          <div><h4>Top legendaries <small>${fremd ? 'only visible for your own account' : 'from the kill trackers on copies you own'}</small></h4><div class="twaffen">${leg.slice(0, 12).map(wkachel).join('') || '<p class="leer klein">No kill trackers found.</p>'}</div></div></div>
          ${staub.length ? `<h4>Collecting dust <small>legendaries you keep but never got a kill with (on these copies)</small></h4><div class="chips">${staub.map((w) => `<span class="chip" data-ih="${w.h}">${esc(w.name)}</span>`).join('')}</div>` : ''}
          <p class="leer klein">Bungie only counts every kill for exotics. For legendaries the app reads the kill tracker on each copy you still own, so older or dismantled copies are missing. A “most hated weapon” (what killed you most) isn't in Bungie's data.</p>`, istOffen('waffen', true))}
      ${block('typen', 'Kills by weapon type', `${zahl(waffenT.reduce((a, t) => a + t.kills, 0))} weapon kills + ${zahl(faehig.reduce((a, t) => a + t.kills, 0))} ability kills = ${zahl(killsAlle)} total`, `<div class="zwei"><div>${waffenT.map((t) => `<div class="tbar" ${TYP_HILFE[t.n] ? `title="${esc(TYP_HILFE[t.n])}"` : ''}><span>${esc(t.n)}${TYP_HILFE[t.n] ? ' ⓘ' : ''}</span><i><b style="width:${(t.kills / maxTyp) * 100}%"></b></i><em>${zahl(t.kills)}</em></div>`).join('')}</div>
          <div><h4>Abilities</h4>${faehig.map((t) => `<div class="tbar" title="${esc(TYP_HILFE[t.n] || '')}"><span>${esc(t.n.replace(' Kills', ''))}${TYP_HILFE[t.n] ? ' ⓘ' : ''}</span><i><b style="width:${(t.kills / Math.max(1, faehig[0]?.kills || 1)) * 100}%"></b></i><em>${zahl(t.kills)}</em></div>`).join('')}
          <p class="leer klein">PvE and PvP together, all characters. The total can be a bit higher than the sum of the types: Bungie counts some kills (e.g. vehicles, environment) without a weapon type.</p></div></div>`, istOffen('typen', false))}
      ${block('spass', 'Fun & odd stats', 'the stuff nobody asked for', spass(d), istOffen('spass', false))}
      ${block('tage', `Last ${TAGE} days`, `${(d.tage.reduce((a, t) => a + t.s, 0) / 3600).toFixed(1)} h played`, `<div class="tage">${d.tage.map((t) => { const h = t.s / 3600; const lbl = `${new Date(t.tag).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}: ${h ? `${h.toFixed(1)} h` : 'not played'}`; return `<div tabindex="0" data-h="${lbl}" aria-label="${lbl}"><em>${h >= 0.1 ? h.toFixed(1) : ''}</em><i style="height:${(t.s / maxTag) * 100}%"></i><small>${t.kurz}</small></div>`; }).join('')}</div>`, istOffen('tage', false))}
      ${block('rest', 'Everything else Bungie tracks', 'all remaining account stats and PvP medals', rest(d), istOffen('rest', false))}
      <div id="stip" class="stip" hidden></div>`;
  };
  zeichne();
  verbinde(haupt, zustand);
  // Spielberichte im Hintergrund nachladen, Ansicht ab und zu auffrischen.
  pgcrNachladen(d, () => { if (haupt.dataset.lauf === lauf && !haupt.querySelector('details.rzeile[open]')) { const y = scrollY; zeichne(); scrollTo({ top: y }); } }, lauf, haupt);
}
const suchzeile = () => `<form class="ssuche" data-suche><input name="n" placeholder="View another Guardian: Name#1234" autocomplete="off" aria-label="Bungie name"><button class="chip">View</button></form>`;
function rest(d) {
  const gezeigt = /^(weaponKills|deaths|suicides|longest|average|totalDeath|totalKill|bestSingle|mostPrecision|resurrections|orbs|publicEvents|heroicPublic|adventures|allMedals|kills$|secondsPlayed|activities|killsDeaths|precisionKills)/;
  const keys = Object.keys(d.alle).filter((k) => !gezeigt.test(k) && wert(d.alle, k));
  const medal = keys.filter((k) => /^medal|^Medals/.test(k)), sonst = keys.filter((k) => !/^medal|^Medals/.test(k));
  const z = (k) => `<tr><td>${esc(statName(k))}</td><td>${esc(d.alle[k].basic.displayValue || zahl(wert(d.alle, k)))}</td></tr>`;
  return `<div class="zwei"><table class="stab links">${sonst.map(z).join('')}</table><div><h4>PvP medals</h4><table class="stab links">${medal.sort((a, b) => wert(d.alle, b) - wert(d.alle, a)).map(z).join('')}</table></div></div>`;
}
const pgcrOffen = (d) => { const c = pgcrLies(); return d.laeufe.filter((l) => l.ok && !c[l.id]).length; };
let ladeLauf = null;
async function pgcrNachladen(d, auffrischen, lauf, haupt) {
  if (ladeLauf === lauf) return; ladeLauf = lauf;
  const c = pgcrLies();
  const offen = d.laeufe.filter((l) => l.ok && !c[l.id]);
  let i = 0, seit = 0;
  const arbeiter = async () => {
    while (i < offen.length && haupt.dataset.lauf === lauf) {
      const l = offen[i++];
      try { await pgcrKurz(l.id); } catch { await new Promise((r) => setTimeout(r, 1500)); }
      if (++seit >= 40) { seit = 0; auffrischen(); }
    }
  };
  await Promise.all(Array.from({ length: 6 }, arbeiter));
  if (haupt.dataset.lauf === lauf && offen.length) auffrischen();
}

function verbinde(haupt, zustand) {
  const tip = () => haupt.querySelector('#stip');
  const zeige = (el, html) => { const t = tip(); if (!t) return; t.innerHTML = html; t.hidden = false; const r = el.getBoundingClientRect(); const w = Math.min(320, innerWidth - 16); const z = d2aZ(); t.style.width = `${w / z}px`; t.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) / z}px`; const h = t.getBoundingClientRect().height; t.style.top = `${(r.bottom + 8 + h > innerHeight ? Math.max(8, r.top - h - 8) : r.bottom + 8) / z}px`; };
  const inhalt = (el) => {
    if (!tipDaten) return '';
    if (el.dataset.tipl) { const [n, i] = el.dataset.tipl.split('|'); const e = tipDaten.ws.find((x) => x.n === n); return e ? punktTip(e.laeufe[Number(i)]) : ''; }
    if (el.dataset.tips) return sealTip(el.dataset.tips, tipDaten.d);
    return '';
  };
  haupt.onmouseover = (e) => { const el = e.target.closest('[data-tipl],[data-tips]'); if (el) zeige(el, inhalt(el)); };
  haupt.onmouseout = (e) => { if (e.target.closest('[data-tipl],[data-tips]') && tip()) tip().hidden = true; };
  haupt.onclick = (e) => {
    const p = e.target.closest('[data-tipl]'); if (p) { zeige(p, inhalt(p)); return; }
    const s = e.target.closest('[data-seal]');
    if (s) { const box = s.closest('details').querySelector('.sealdetail'); const gleich = box.dataset.h === s.dataset.seal && !box.hidden; box.hidden = gleich; box.dataset.h = s.dataset.seal; if (!gleich) { box.innerHTML = sealDetail(s.dataset.seal, tipDaten.d); box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } return; }
    const wc = e.target.closest('[data-wikichal]');
    if (wc) { import('./app.js').then((m) => m.springeWiki('chal', wc.dataset.wikichal)); return; }
    if (e.target.closest('[data-ich]')) { fremd = null; zeigeStats(haupt, zustand); return; }
    if (!e.target.closest('#stip') && tip()) tip().hidden = true;
  };
  haupt.addEventListener('toggle', (e) => { const b = e.target.closest?.('[data-blk]'); if (b && e.target === b) { offenStand[b.dataset.blk] = b.open; try { localStorage.setItem('d2a.statsOffen', JSON.stringify(offenStand)); } catch {} } }, true);
  const f = haupt.querySelector('[data-suche]');
  f?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const roh = f.n.value.trim(); const m = roh.match(/^(.+)#(\d{1,4})$/);
    if (!m) { f.n.value = ''; f.n.placeholder = 'Use the full Bungie name, e.g. Name#1234'; return; }
    try {
      const r = await bungie.post('/Destiny2/SearchDestinyPlayerByBungieName/-1/', { displayName: m[1], displayNameCode: Number(m[2]) });
      const x = (r || []).find((y) => !y.crossSaveOverride || y.crossSaveOverride === y.membershipType) || r?.[0];
      if (!x) { f.n.value = ''; f.n.placeholder = 'Nobody found with that name'; return; }
      fremd = { membershipType: x.membershipType, membershipId: x.membershipId, name: `${x.bungieGlobalDisplayName}#${String(x.bungieGlobalDisplayNameCode).padStart(4, '0')}` };
      zeigeStats(haupt, zustand);
    } catch (err) { f.n.value = ''; f.n.placeholder = err.message; }
  });
}
