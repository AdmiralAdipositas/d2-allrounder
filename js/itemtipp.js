// Hover-Ansicht wie im Spiel: Kopf in Seltenheitsfarbe, Stat-Tabelle mit Balken, Perks nach Spalten,
// Rüstungs-Mods mit Energie, Stat-Mod, Set-Bonus und Exotic-Perk. Genutzt im Tresor und auf der Hüter-Seite.
import { defs } from './defs.js';
import { ARMOR_STATS } from './vault.js';
import { empfehlung, rollWert, rollBalken } from './rolls.js';

const BILD = 'https://www.bungie.net';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const satz = (t) => esc(String(t || '').split(/(?<=\.)\s/)[0]);
// Waffen-Stats in Spiel-Reihenfolge; Zahlen-Stats (ohne Balken) extra.
const WSTATS = ['Impact', 'Blast Radius', 'Velocity', 'Draw Time', 'Charge Time', 'Accuracy', 'Range', 'Stability', 'Handling', 'Reload Speed', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Recoil Direction', 'Swing Speed', 'Guard Efficiency', 'Guard Resistance', 'Charge Rate', 'Ammo Capacity', 'Shield Duration', 'Heat Generated', 'Vent Speed', 'Persistence'];
const ZAHLEN = ['Rounds Per Minute', 'Magazine'];
const ENERGIE = 3578062600;
const PERKSPALTE = /^(barrels|scopes|magazines|magazines_gl|tubes|arrows|batteries|blades|guards|hafts|bowstrings|stocks|grips|frames|origins|intrinsics)$/;

export function itemTipp(it, profil) {
  const d = it.d;
  const st = profil?.itemComponents?.stats?.data?.[it.id]?.stats || {};
  const name = (h) => defs.stats?.[h]?.n;
  const plugs = (it.sockel || it.plugs || []).filter(Boolean).map((p) => [p, defs.items[p]]).filter(([, x]) => x);
  const klasse = d.q === 6 ? 'exo' : d.q === 5 ? 'leg' : 'sel';
  let html = `<div class="itwrap"><div class="it-kopf ${klasse}"><b>${esc(d.n)}</b><span>${esc(d.k)}</span>${it.power ? `<em>${it.power}</em>` : ''}</div><div class="it-rumpf">${it.kills ? `<div class="it-kills"><b>${it.kills.toLocaleString()}</b> kills <small>kill tracker</small></div>` : ''}`;
  if (d.t === 3) {
    const werte = Object.values(st).map((s) => [name(s.statHash), s.value]).filter(([n]) => n);
    const balken = WSTATS.map((n) => werte.find(([w]) => w === n)).filter(Boolean);
    const zahl = ZAHLEN.map((n) => werte.find(([w]) => w === n)).filter(Boolean);
    if (balken.length || zahl.length) html += `<div class="it-stats">${balken.map(([n, v]) => `<div><small>${esc(n)}</small><i><u style="width:${Math.min(100, v)}%"></u></i><b>${v}</b></div>`).join('')}${zahl.map(([n, v]) => `<div class="zahl"><small>${esc(n)}</small><b>${v}</b></div>`).join('')}</div>`;
    if (d.xd) html += `<p class="tt"><b class="tgold">${esc(d.xp || 'Exotic perk')}</b> ${esc(d.xd)}</p>`;
    if (d.q !== 6) html += rollBalken(rollWert(it.hash, it.plugs || []));
    const wunsch = new Set([...(empfehlung(it.hash)?.e || []), ...(empfehlung(it.hash)?.v || [])]);
    const perks = plugs.filter(([, x]) => PERKSPALTE.test(x.pc || '') && x.i);
    if (perks.length) html += `<div class="it-perks">${perks.map(([h, x]) => `<div class="${d.q !== 6 && wunsch.has(h) ? 'wunsch' : ''}"><i style="background-image:url(${BILD}${x.i})"></i><span><b>${esc(x.n)}</b>${x.d ? ` <small>${satz(x.d)}</small>` : ''}</span></div>`).join('')}</div>`;
    const mods = plugs.filter(([, x]) => /^v400\.weapon\.mod_|weapon\.mod_|^masterworks/.test(x.pc || '') && x.i && !/^Empty/.test(x.n));
    if (mods.length) html += `<div class="it-mods">${mods.map(([, x]) => `<span><i style="background-image:url(${BILD}${x.i})"></i>${esc(x.n)}</span>`).join('')}</div>`;
  } else if (d.t === 2) {
    if (it.st) html += `<div class="it-stats">${ARMOR_STATS.map((n) => `<div><small>${n}</small><i><u style="width:${Math.min(100, (it.st[n] || 0) / 0.45)}%"></u></i><b>${it.st[n] || 0}</b></div>`).join('')}<div class="zahl"><small>Total</small><b>${it.st.Total}</b></div></div>`;
    if (d.xd) html += `<p class="tt"><b class="tgold">${esc(d.xp || 'Exotic perk')}</b> ${esc(d.xd)}</p>`;
    const mods = plugs.filter(([, x]) => /^enhancements\.v2_/.test(x.pc || ''));
    const kosten = mods.reduce((a, [, x]) => a + ((x.s || []).find(([h]) => Number(h) === ENERGIE)?.[1] || 0), 0);
    if (mods.length) html += `<div class="it-energie"><small>Armor energy</small><span>${Array.from({ length: Math.max(it.energie || 0, kosten) }, (_, i) => `<i class="${i < kosten ? 'voll' : ''}"></i>`).join('')}</span><b>${kosten}/${it.energie || '?'}</b></div>
      <div class="it-perks">${mods.map(([, x]) => { const leer = /^Empty|Mod Socket$/.test(x.n); const c = (x.s || []).find(([h]) => Number(h) === ENERGIE)?.[1]; return `<div class="${leer ? 'leer' : ''}"><i style="background-image:url(${BILD}${x.i})"></i><span><b>${leer ? 'Empty mod slot' : esc(x.n)}</b>${!leer && x.d ? ` <small>${satz(x.d)}</small>` : ''}</span>${c ? `<em>${c}</em>` : ''}</div>`; }).join('')}</div>`;
    const set = d.e ? defs.sets?.[d.e] : null;
    if (set) html += `<div class="tset"><b>${esc(set.n)}</b>${set.p.map((p) => `<span><em>${p.c}-piece · ${esc(p.n)}</em> ${esc(p.d)}</span>`).join('')}</div>`;
  }
  if (it.grund && d.t === 3) html += `<div class="tputz ${it.junk ? 'weg' : ''}"><b>${it.junk ? 'Can go' : 'Keeps'}:</b> ${esc(it.grund)}</div>`;
  html += `<small class="thint">Click for details · Shift to pin</small></div></div>`;
  return html;
}

// Tooltip an einer Stelle zeigen (gleiches #tipp-Element wie überall).
export function zeigeItemTipp(it, profil, x, y) {
  const tipp = document.querySelector('#tipp');
  if (!tipp || !it) return;
  tipp.innerHTML = itemTipp(it, profil);
  tipp.hidden = false;
  const r = tipp.getBoundingClientRect();
  tipp.style.left = `${(Math.max(8, Math.min(x + 14, innerWidth - r.width - 8))) / d2aZ()}px`;
  tipp.style.top = `${(Math.max(8, Math.min(y + 14, innerHeight - r.height - 8))) / d2aZ()}px`;
}
