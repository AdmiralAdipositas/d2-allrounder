// Katalysatoren für Exotic-Waffen: was er macht, wie man ihn bekommt (Bungies Triumph-Text + Ziele) und dein Stand.
// Daten: defs.kat (aus tools/defs.mjs). Stand kommt aus dem Katalysator-Sockel der Waffe (Komponenten 305 + 309).
import { defs } from './defs.js';

const BILD = 'https://www.bungie.net';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
export const katVon = (hash) => defs.kat?.[hash] || null;

// Stand einer bestimmten Kopie: fehlt (leerer Sockel) · läuft (x/y) · fertig.
export function katStand(it, profil) {
  if (!it?.id) return null;
  const so = profil?.itemComponents?.sockets?.data?.[it.id]?.sockets || (it.sockel || []).map((plugHash) => ({ plugHash }));
  const ziele = profil?.itemComponents?.plugObjectives?.data?.[it.id]?.objectivesPerPlug || {};
  for (const s of so) {
    const p = defs.items[s.plugHash]; if (!p) continue;
    if (p.n === 'Empty Catalyst Socket') return { art: 'fehlt', ziele: [] };
    if (/ Catalyst$/.test(p.n) && /masterwork|catalyst/i.test(p.pc || '')) {
      const ko = katVon(it.hash)?.o || [];
      const z = (ziele[s.plugHash] || []).map((o) => ({ d: ko.find((x) => x[0] === o.objectiveHash)?.[1] || '', ist: o.progress || 0, soll: o.completionValue || 1, ok: !!o.complete }));
      return { art: !z.length || z.every((x) => x.ok) ? 'fertig' : 'laeuft', ziele: z };
    }
  }
  return null;
}

// Kasten für Hover-Fenster, Detail-Ansicht und Wiki. opt.kurz = ohne „So bekommst du ihn“.
export function katBlock(hash, it, profil, opt = {}) {
  const k = katVon(hash); const d = defs.items[hash];
  if (!k && !(d?.q === 6 && d?.t === 3)) return '';
  const st = it ? katStand(it, profil) : null;
  const STAT = { fehlt: ['not obtained yet', 'k-fehlt'], laeuft: ['in progress', 'k-laeuft'], fertig: ['complete', 'k-fertig'] };
  const [stT, stK] = STAT[st?.art] || ['', ''];
  if (!k) return opt.kurz ? '' : `<div class="kat"><div class="kat-kopf"><b>Catalyst</b><small>No catalyst info for this weapon yet.</small></div></div>`;
  const ziele = st?.ziele?.length ? st.ziele : k.o.map(([, dd, soll]) => ({ d: dd, ist: null, soll }));
  const zeilen = ziele.filter((z) => z.d || z.soll > 1).map((z) => `<div class="kat-ziel">${z.ist != null ? `<i><b style="width:${Math.min(100, (z.ist / z.soll) * 100)}%"></b></i>` : ''}<span>${esc(z.d || 'Progress')}</span><em>${z.ist != null ? `${z.ist.toLocaleString()} / ` : ''}${z.soll.toLocaleString()}</em></div>`).join('');
  return `<div class="kat ${stK}"><div class="kat-kopf">${k.i ? `<i class="kat-ic" style="background-image:url(${BILD}${k.i})"></i>` : ''}<b>${esc(k.n)}</b>${stT ? `<em class="kat-st">${stT}</em>` : ''}</div>
    ${k.p.length ? k.p.map(([n, t]) => `<p><b class="tgold">${esc(n)}</b> ${esc(t)}</p>`).join('') : ''}
    ${!opt.kurz && k.d ? `<p class="kat-wie"><small>How to get it</small>${esc(k.d)}</p>` : ''}${zeilen ? `<div class="kat-ziele">${zeilen}</div>` : ''}</div>`;
}
