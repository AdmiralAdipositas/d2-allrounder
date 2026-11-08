// Aussehen: „Colorful“ (Standard), „Destiny OG“ (grau, ruhig) oder „My shader“ (ganze App in den Farben eines eigenen Shaders).
// Gilt für dieses Gerät; das Inline-Skript in index.html setzt es schon vor dem ersten Zeichnen (auch die Shader-Farben).
export const THEMEN = [['bunt', 'Colorful', 'Violet surfaces and colored navigation (default)'], ['og', 'Destiny OG', 'Calm grey, near-monochrome, like the in-game menus'], ['shader', 'My shader', 'Pick one of your shaders, the whole app takes on all its colors']];
const lies = (k, s) => { try { return localStorage.getItem(k) || s; } catch { return s; } };
const schreib = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
export function thema() { const t = lies('d2a.theme', 'bunt'); return t === 'shader' && !lies('d2a.shaderVars', '') ? 'bunt' : t; }
export function shaderWahl() { try { return JSON.parse(lies('d2a.shaderWahl', 'null')); } catch { return null; } }

function setzeVars(vars) {
  const st = document.documentElement.style;
  for (const n of [...st]) if (n.startsWith('--')) st.removeProperty(n);
  for (const [k, v] of Object.entries(vars || {})) st.setProperty(k, v);
}
export function setzeThema(t) {
  if (t === 'shader' && !lies('d2a.shaderVars', '')) t = 'bunt';
  schreib('d2a.theme', t);
  document.documentElement.dataset.theme = t;
  // Easter Egg: „Photo Finish“ ist im Spiel ein RGB-Shader – hier läuft die App dann im Farbkreis.
  if (t === 'shader' && /^photo finish$/i.test(shaderWahl()?.n || '')) document.documentElement.dataset.pf = '1'; else delete document.documentElement.dataset.pf;
  setzeVars(t === 'shader' ? JSON.parse(lies('d2a.shaderVars', '{}')) : null);
  const bg = t === 'og' ? '#0b0d10' : t === 'shader' ? JSON.parse(lies('d2a.shaderVars', '{}'))['--bg'] : '#0b0a1a';
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', bg || '#0b0a1a');
}

// ---------- Farben aus dem Shader-Icon ----------
const hsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s, l]; };
const css = (h, s, l, a) => `hsl(${Math.round(h)} ${Math.round(Math.max(0, Math.min(1, s)) * 100)}% ${Math.round(Math.max(0, Math.min(1, l)) * 100)}%${a != null ? ` / ${a}` : ''})`;
// k-means über alle Pixel des Icons: liefert die Farben nach Anteil sortiert.
export async function palette(url) {
  const img = new Image(); img.crossOrigin = 'anonymous'; img.src = url;
  await new Promise((ok, f) => { img.onload = ok; img.onerror = f; });
  const c = document.createElement('canvas'); c.width = c.height = 48; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 48, 48);
  const d = x.getImageData(0, 0, 48, 48).data; const px = [];
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) px.push([d[i], d[i + 1], d[i + 2]]);
  let zentren = Array.from({ length: 10 }, (_, i) => px[Math.floor((i + 0.5) * px.length / 10)]);
  let gruppen = [];
  for (let it = 0; it < 12; it++) {
    gruppen = zentren.map(() => []);
    for (const p of px) { let bi = 0, bd = 1e9; zentren.forEach((z, i) => { const dd = (p[0] - z[0]) ** 2 + (p[1] - z[1]) ** 2 + (p[2] - z[2]) ** 2; if (dd < bd) { bd = dd; bi = i; } }); gruppen[bi].push(p); }
    zentren = gruppen.map((g, i) => (g.length ? [0, 1, 2].map((k) => g.reduce((a, p) => a + p[k], 0) / g.length) : zentren[i]));
  }
  const farben = zentren.map((z, i) => ({ rgb: z.map(Math.round), anteil: gruppen[i].length / px.length, hsl: hsl(z) })).filter((f) => f.anteil > 0.008);
  // Fast gleiche Farben zusammenlegen.
  const raus = [];
  for (const f of farben.sort((a, b) => b.anteil - a.anteil)) { const n = raus.find((g) => Math.hypot(...g.rgb.map((v, k) => v - f.rgb[k])) < 28); if (n) n.anteil += f.anteil; else raus.push(f); }
  return raus;
}
// Aus der Palette die App-Farben: Flächen aus der Grundfarbe (dunkel), Akzente aus den kräftigen Farben, Navigation durch alle Farben.
export function varsAus(pal) {
  const bunt = pal.filter((f) => f.hsl[1] > 0.2 && f.hsl[2] > 0.07 && f.hsl[2] < 0.92);
  const basis = (bunt.length ? bunt : pal).slice().sort((a, b) => b.anteil - a.anteil)[0];
  const chroma = (f) => f.hsl[1] * (1 - Math.abs(2 * f.hsl[2] - 1)); // wie „bunt“ eine Farbe wirklich aussieht
  const akzente = (bunt.length ? bunt : pal).slice().sort((a, b) => (chroma(b) + b.hsl[1] * 0.5) * (0.6 + Math.sqrt(b.anteil)) - (chroma(a) + a.hsl[1] * 0.5) * (0.6 + Math.sqrt(a.anteil)));
  const a1 = akzente[0];
  // Flächen im Farbton der kräftigsten Shader-Farbe tönen (sonst wirken z. B. lila Shader mit grauer Basis leblos).
  const tonQuelle = bunt.length && a1.hsl[1] > 0.35 ? a1 : basis;
  const bh = tonQuelle.hsl[0], bs0 = tonQuelle.hsl[1]; const neutral = bs0 < 0.15; const bs = neutral ? bs0 : Math.min(0.7, Math.max(0.4, bs0)); const a2 = akzente.find((f) => Math.abs(((f.hsl[0] - a1.hsl[0] + 540) % 360) - 180) > 35) || akzente[1] || a1;
  // Neutrale Shader (Schwarz/Weiß/Grau) bleiben neutral: keine erfundene Farbe.
  // Akzente als Neon: volle Sättigung, mittlere Helligkeit. Neutrale Farben bleiben neutral.
  const hell = (f, l) => css(f.hsl[0], f.hsl[1] < 0.15 ? f.hsl[1] : Math.max(0.9, f.hsl[1]), f.hsl[1] < 0.15 ? Math.max(l, 0.8) : l);
  const v = {
    '--bg': css(bh, bs, 0.07), '--bg2': css(bh, bs, 0.1), '--flaeche': css(bh, bs, 0.13), '--flaeche2': css(bh, bs, 0.18), '--linie': css(a1.hsl[0], neutral ? 0.1 : 0.6, 0.3),
    '--text': css(bh, 0.2, 0.94), '--matt': css(bh, 0.18, 0.66), '--text2': css(bh, 0.2, 0.84), '--text3': css(bh, 0.2, 0.88),
    '--violett': hell(a1, 0.62), '--gold': hell(a2, 0.62), '--violett33': css(a1.hsl[0], a1.hsl[1] < 0.15 ? a1.hsl[1] : Math.max(0.35, a1.hsl[1]), 0.68, 0.2), '--violett55': css(a1.hsl[0], a1.hsl[1] < 0.15 ? a1.hsl[1] : Math.max(0.35, a1.hsl[1]), 0.68, 0.33),
    '--flaeche3': css(bh, bs, 0.17), '--bg3': css(bh, bs, 0.075), '--linie2': css(a1.hsl[0], neutral ? 0.1 : 0.6, 0.36), '--bg0': css(bh, bs, 0.05), '--bg4': css(bh, bs, 0.07), '--bg5': css(bh, bs, 0.08), '--bg6': css(bh, bs, 0.1),
    '--det1': css(bh, bs, 0.12), '--det2': css(bh, bs, 0.065), '--rail1': css(bh, bs, 0.09, 0.95), '--rail2': css(bh, bs, 0.055, 0.95),
    '--glow1': css(a1.hsl[0], Math.max(0.8, a1.hsl[1]), 0.4, 0.45), '--glow2': css(a2.hsl[0], Math.max(0.8, a2.hsl[1]), 0.4, 0.35),
  };
  // Restliche fest eingetragene Flächenfarben (--p…): gleiche Helligkeit, Farbton des Shaders.
  for (const [k, l] of [['--p110e25', 0.1], ['--p07051a', 0.06], ['--p050310', 0.04], ['--p120c22', 0.09], ['--p2a2450', 0.24], ['--p5b3a8f', 0.4], ['--p3b2560', 0.26], ['--p0b0920', 0.08], ['--p16123a', 0.15], ['--p0b0a1a', 0.07]]) v[k] = css(bh, bs, l);
  // Alle Shader-Farben für die Navigation und Akzente (--sh1 … --sh6), hell genug für dunkle Flächen.
  const alle = [...akzente, ...pal.filter((f) => !akzente.includes(f))];
  for (let i = 0; i < 6; i++) { const f = alle[i % alle.length]; v[`--sh${i + 1}`] = f.hsl[1] < 0.12 ? css(bh, 0.15, Math.max(0.7, f.hsl[2])) : hell(f, 0.62); }
  v['--shpal'] = pal.map((f) => `rgb(${f.rgb.join(' ')})`).join(',');
  return v;
}
export async function waehleShader(h, d) {
  const pal = await palette(`https://www.bungie.net${d.i}`);
  const v = varsAus(pal);
  schreib('d2a.shaderVars', JSON.stringify(v));
  schreib('d2a.shaderWahl', JSON.stringify({ h, n: d.n, i: d.i, pal: pal.map((f) => f.rgb) }));
  setzeThema('shader');
  schreib('d2a.shaderV', '3');
  return pal;
}

// Knopfreihe zum Umschalten (Konto und Willkommen nutzen dieselbe).
export function themaKnoepfe() {
  const an = thema(); const sw = shaderWahl();
  return `<div class="thema-wahl" role="radiogroup" aria-label="Look">${THEMEN.map(([c, n, d]) => `<button type="button" role="radio" aria-checked="${c === an}" data-thema="${c}" class="${c === an ? 'an' : ''}"><span class="th-probe th-${c}">${c === 'shader' && sw ? sw.pal.slice(0, 6).map((p) => `<i style="background:rgb(${p.join(' ')})"></i>`).join('') : '<i></i><i></i><i></i>'}</span><b>${n}${c === 'shader' && sw ? ` · <span data-roh>${sw.n}</span>` : ''}</b><small>${d}</small></button>`).join('')}</div><div class="shader-wahl" hidden></div>`;
}
export function verbindeThema(el, eigeneShader) {
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-thema]');
    const s = e.target.closest('[data-shader]');
    const box = el.querySelector('.shader-wahl');
    if (s) {
      const d = (await import('./defs.js')).defs.items[s.dataset.shader];
      s.classList.add('lädt');
      try { await waehleShader(s.dataset.shader, d); } catch { s.classList.remove('lädt'); return; }
      el.querySelectorAll('[data-thema]').forEach((x) => { const a = x.dataset.thema === 'shader'; x.classList.toggle('an', a); x.setAttribute('aria-checked', a); });
      const sw = shaderWahl(); const probe = el.querySelector('.th-shader'); if (probe && sw) probe.innerHTML = sw.pal.slice(0, 6).map((p) => `<i style="background:rgb(${p.join(' ')})"></i>`).join('');
      el.querySelectorAll('[data-shader]').forEach((x) => x.classList.toggle('an', x === s)); s.classList.remove('lädt');
      return;
    }
    if (!b) return;
    if (b.dataset.thema === 'shader') {
      if (box) { box.hidden = false; box.innerHTML = '<p class="leer klein">Loading your shaders…</p>'; box.innerHTML = await shaderListe(eigeneShader); }
      if (!lies('d2a.shaderVars', '')) return; // erst einen wählen
    } else if (box) box.hidden = true;
    setzeThema(b.dataset.thema);
    el.querySelectorAll('[data-thema]').forEach((x) => { const a = x === b; x.classList.toggle('an', a); x.setAttribute('aria-checked', a); });
  });
  el.addEventListener('input', (e) => {
    const q = e.target.closest('.shader-suche'); if (!q) return;
    const t = q.value.trim().toLowerCase();
    el.querySelectorAll('[data-shader]').forEach((x) => { x.hidden = t && !x.dataset.n.includes(t); });
  });
}
async function shaderListe(eigene) {
  const { defs } = await import('./defs.js');
  const hashes = eigene ? await eigene() : null;
  const alle = Object.entries(defs.items).filter(([, d]) => d.pc === 'shader' && d.i && (!hashes || hashes.has(Number(d.co)))).sort((a, b) => a[1].n.localeCompare(b[1].n));
  const an = shaderWahl()?.h;
  return `<input class="shader-suche" type="search" placeholder="Search your shaders…" aria-label="Search shaders"><p class="leer klein">${hashes ? `${alle.length} shaders in your collection.` : 'Your collection could not be read, showing all shaders.'} Tap one: the whole app takes on its colors.</p>
    <div class="shader-gitter">${alle.map(([h, d]) => `<button type="button" data-shader="${h}" data-n="${d.n.toLowerCase().replace(/"/g, '')}" class="${String(an) === h ? 'an' : ''}" title="${d.n.replace(/"/g, '&quot;')}"><i style="background-image:url(https://www.bungie.net${d.i})"></i><span>${d.n}</span></button>`).join('')}</div>`;
}

// App-Größe: Zoom für die ganze App (zusätzlich zu Pinch/Strg+Mausrad), pro Gerät gespeichert.
export const ZOOMS = [0.85, 1, 1.15, 1.3, 1.5];
export function zoom() { return parseFloat(lies('d2a.zoom', '1')) || 1; }
export function setzeZoom(z) {
  z = Math.round(Math.max(0.7, Math.min(1.3, z)) * 100) / 100;
  schreib('d2a.zoom', String(z));
  // Touch-Geräte (iPhone): CSS-zoom lässt dort rechts einen schwarzen Rand – stattdessen alles über die Schriftgröße skalieren.
  if (matchMedia('(hover: none)').matches) { document.documentElement.style.zoom = ''; document.documentElement.style.setProperty('--txt', String(textGroesse() * z)); }
  else document.documentElement.style.zoom = z === 1 ? '' : String(z);
  // Kleine Leiste unten links, die immer im Bild bleibt – falls der Schieber aus dem Bild rutscht.
  let p = document.querySelector('#zoomPille');
  if (!p) { p = document.createElement('div'); p.id = 'zoomPille'; document.body.append(p);
    p.onclick = (e) => { const b = e.target.closest('[data-zp]'); if (!b) return; const n = b.dataset.zp === '1' ? 1 : zoom() + Number(b.dataset.zp); setzeZoom(n); document.querySelectorAll('[data-zoomr]').forEach((r) => { r.value = zoom(); }); document.querySelectorAll('[data-zw]').forEach((w) => { w.textContent = `${Math.round(zoom() * 100)} %`; }); }; }
  p.innerHTML = `<span>App size</span><button data-zp="-0.05" aria-label="Smaller">−</button><b>${Math.round(z * 100)} %</b><button data-zp="0.05" aria-label="Bigger">+</button><button data-zp="1" title="Back to 100 %">↺</button>`;
  p.hidden = false; clearTimeout(p._t); p._t = setTimeout(() => { p.hidden = true; }, 8000);
}
export function textGroesse() { return parseFloat(lies('d2a.txt', '1')) || 1; }
export function setzeText(t) { schreib('d2a.txt', String(t)); document.documentElement.style.setProperty('--txt', String(t * (matchMedia('(hover: none)').matches ? zoom() : 1))); }
// Zwei Schieber: ganze App (Zoom) und nur die Schrift. Ein Klick auf „↺“ setzt zurück.
export function zoomKnoepfe() {
  const z = zoom(), t = textGroesse();
  return `<div class="groesse"><label><span>App size</span><input type="range" min="0.7" max="1.3" step="0.05" value="${z}" data-zoomr aria-label="App size"><b data-zw>${Math.round(z * 100)} %</b><button type="button" class="chip klein" data-zoomreset title="Reset">↺</button></label>
    <label><span>Text size</span><input type="range" min="0.85" max="1.4" step="0.05" value="${t}" data-txtr aria-label="Text size"><b data-tw>${Math.round(t * 100)} %</b><button type="button" class="chip klein" data-txtreset title="Reset">↺</button></label></div>
    <p class="leer klein">App size scales everything, text size only the writing. Pinch or Ctrl + mouse wheel also works.</p>`;
}
export function verbindeZoom(el) {
  const zr = el.querySelector('[data-zoomr]'), tr = el.querySelector('[data-txtr]');
  // Zoom erst beim Loslassen anwenden (sonst springt der Schieber unter dem Finger weg), Text sofort.
  zr?.addEventListener('input', () => { el.querySelector('[data-zw]').textContent = `${Math.round(zr.value * 100)} %`; });
  zr?.addEventListener('change', () => setzeZoom(Number(zr.value)));
  tr?.addEventListener('input', () => { el.querySelector('[data-tw]').textContent = `${Math.round(tr.value * 100)} %`; setzeText(Number(tr.value)); });
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-zoomreset]')) { setzeZoom(1); zr.value = 1; el.querySelector('[data-zw]').textContent = '100 %'; }
    if (e.target.closest('[data-txtreset]')) { setzeText(1); tr.value = 1; el.querySelector('[data-tw]').textContent = '100 %'; }
  });
}

// Ältere „Mein Shader“-Farben einmal mit der neuen Farbauswahl neu berechnen (kräftigere Akzente).
try {
  if (lies('d2a.theme', '') === 'shader' && lies('d2a.shaderV', '') !== '3') {
    const sw = shaderWahl();
    if (sw?.i) waehleShader(sw.h, { n: sw.n, i: sw.i }).then(() => schreib('d2a.shaderV', '3')).catch(() => {});
  }
} catch {}
