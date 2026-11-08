// Teilen-Karten: ein schickes Bild (1200×630) für Discord & Co. – Build, Loadout, Würfel-Ergebnis, Raid-Clear.
// Zeichnet auf ein Canvas im App-Look; Bilder von bungie.net werden mit CORS geladen, sonst einfach weggelassen.
const BILD = 'https://www.bungie.net';

function ladeBild(src) {
  return new Promise((ok) => {
    if (!src) return ok(null);
    const i = new Image(); i.crossOrigin = 'anonymous';
    i.onload = () => ok(i); i.onerror = () => ok(null);
    i.src = src.startsWith('http') ? src : BILD + src;
    setTimeout(() => ok(null), 4000);
  });
}
const farbe = (n, f) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f;

function umbruch(ctx, text, x, y, breite, zeile, max = 3) {
  const w = String(text).split(/\s+/); let z = '', n = 0;
  for (const wort of w) {
    const t = z ? `${z} ${wort}` : wort;
    if (ctx.measureText(t).width > breite && z) { ctx.fillText(z, x, y + n * zeile); z = wort; if (++n >= max) return n; } else z = t;
  }
  if (z) { ctx.fillText(n === max - 1 && ctx.measureText(z).width > breite ? `${z.slice(0, 40)}…` : z, x, y + n * zeile); n++; }
  return n;
}

// k = { art: 'BUILD' | 'LOADOUT' | 'RANDOMIZER' | 'RAID CLEAR', titel, unter, text, chips: [], zeilen: [[label, wert]], bilder: [src], hinter: src }
export async function baueKarte(k) {
  const W = 1200, H = 630, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const gold = farbe('--gold', '#e8c35a'), viol = farbe('--violett', '#9b7bff'), bg = farbe('--bg', '#0d0b1c'), text = '#ece9ff', matt = '#9a93c2';
  // Hintergrund: dunkel, Akzent-Verlauf, feines Raster
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  const hint = await ladeBild(k.hinter);
  if (hint) { x.globalAlpha = 0.28; const s = Math.max(W / hint.width, H / hint.height); x.drawImage(hint, (W - hint.width * s) / 2, (H - hint.height * s) / 2, hint.width * s, hint.height * s); x.globalAlpha = 1; }
  let g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, `${bg}f0`); g.addColorStop(0.6, `${bg}c8`); g.addColorStop(1, `${bg}90`); x.fillStyle = g; x.fillRect(0, 0, W, H);
  g = x.createRadialGradient(W * 0.85, H * 0.1, 10, W * 0.85, H * 0.1, 520); g.addColorStop(0, `${viol}55`); g.addColorStop(1, 'transparent'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#ffffff08'; x.lineWidth = 1; for (let i = 0; i < W; i += 40) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } for (let i = 0; i < H; i += 40) { x.beginPath(); x.moveTo(0, i); x.lineTo(W, i); x.stroke(); }
  // Rahmen mit Gold-Ecke
  x.strokeStyle = `${gold}aa`; x.lineWidth = 3; x.strokeRect(18, 18, W - 36, H - 36);
  x.fillStyle = gold; x.fillRect(18, 18, 120, 6); x.fillRect(18, 18, 6, 60);
  // Kopf
  x.fillStyle = gold; x.font = '700 22px system-ui, sans-serif'; x.fillText((k.art || '').split('').join(' '), 60, 82);
  x.fillStyle = text; x.font = '800 60px system-ui, sans-serif'; umbruch(x, k.titel || '', 60, 150, W - 120, 64, 2);
  let y = 150 + (x.measureText(k.titel || '').width > W - 120 ? 64 : 0) + 46;
  if (k.unter) { x.fillStyle = matt; x.font = '500 26px system-ui, sans-serif'; x.fillText(k.unter, 60, y); y += 44; }
  // Chips
  if (k.chips?.length) {
    x.font = '700 22px system-ui, sans-serif'; let cx = 60;
    for (const ch of k.chips.slice(0, 6)) { const w = x.measureText(ch).width + 32; if (cx + w > W - 60) break; x.fillStyle = '#ffffff10'; x.strokeStyle = `${gold}88`; x.lineWidth = 2; x.beginPath(); x.roundRect(cx, y - 28, w, 40, 20); x.fill(); x.stroke(); x.fillStyle = text; x.fillText(ch, cx + 16, y); cx += w + 10; }
    y += 50;
  }
  // Bilder (Items)
  const bilder = (await Promise.all((k.bilder || []).slice(0, 8).map(ladeBild))).filter(Boolean);
  if (bilder.length) {
    const s = 96; bilder.forEach((b, i) => { const bx = 60 + i * (s + 14); x.drawImage(b, bx, y, s, s); x.strokeStyle = i === 0 && k.ersteGold ? gold : '#ffffff40'; x.lineWidth = 3; x.strokeRect(bx, y, s, s); });
    y += s + 30;
  }
  // Text
  if (k.text) { x.fillStyle = '#d6d1f5'; x.font = '400 24px system-ui, sans-serif'; y += umbruch(x, k.text, 60, y + 10, W - 120, 32, 3) * 32 + 10; }
  // Zeilen (Label: Wert) zweispaltig unten
  if (k.zeilen?.length) {
    const z = k.zeilen.slice(0, 8); const spalten = z.length > 4 ? 2 : 1; const bw = (W - 120) / spalten;
    const reihen = Math.ceil(z.length / spalten); const platz = Math.floor((H - 80 - (y + 14)) / 38);
    const start = Math.max(y + 14, H - 80 - Math.min(reihen, platz) * 38) + 24;
    z.forEach(([l, v], i) => { const r = Math.floor(i / spalten); if (r >= platz) return; const sx = 60 + (i % spalten) * bw, sy = start + r * 38;
      x.fillStyle = matt; x.font = '600 18px system-ui, sans-serif'; x.fillText(String(l).toUpperCase(), sx, sy);
      x.fillStyle = text; x.font = '700 22px system-ui, sans-serif'; let t = String(v); const lw = Math.min(200, bw * 0.4), max = bw - lw - 20;
      while (x.measureText(t).width > max && t.length > 4) t = `${t.slice(0, -2)}…`.replace(/……$/, '…');
      x.fillText(t, sx + lw, sy); });
  }
  // Fuß
  x.fillStyle = `${gold}cc`; x.font = '700 20px system-ui, sans-serif'; x.fillText('D2 ALLROUNDER', W - 250, H - 40);
  x.fillStyle = '#ffffff55'; x.font = '400 16px system-ui, sans-serif'; x.fillText('Unofficial fan app', 60, H - 40);
  return c;
}

// Karte bauen und teilen (Handy: Teilen-Menü) bzw. kopieren/herunterladen (PC). Zeigt vorher eine Vorschau.
export async function teileKarte(k) {
  document.querySelector('#teilKarte')?.remove();
  const d = document.createElement('dialog'); d.id = 'teilKarte'; d.className = 'teil-dlg';
  d.innerHTML = '<p class="leer"><i class="spinner"></i> Building your card…</p>'; document.body.append(d); d.showModal();
  d.addEventListener('close', () => d.remove());
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  let c; try { c = await baueKarte(k); } catch (e) { d.innerHTML = `<p class="leer">Could not build the card: ${e.message}</p>`; return; }
  let blob = null; try { blob = await new Promise((ok) => c.toBlob(ok, 'image/png')); } catch {}
  const name = `${(k.titel || 'd2').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.png`;
  d.innerHTML = `<div class="teil-kopf"><b>📸 Share card</b><button class="ikon" data-z aria-label="Close">✕</button></div><img alt="" src="${c.toDataURL('image/png')}"><div class="teil-knoepfe">
    ${navigator.canShare && blob && navigator.canShare({ files: [new File([blob], name, { type: 'image/png' })] }) ? '<button class="haupt-knopf" data-t="share">Share…</button>' : ''}
    ${blob && navigator.clipboard?.write && window.ClipboardItem ? '<button class="chip" data-t="copy">Copy image</button>' : ''}<button class="chip" data-t="dl">Download</button></div><small class="leer">Paste straight into Discord.</small>`;
  d.onclick = async (e) => {
    if (e.target === d || e.target.closest('[data-z]')) return d.close();
    const t = e.target.closest('[data-t]')?.dataset.t; if (!t) return;
    const { meldung } = await import('./app.js');
    try {
      if (t === 'share') await navigator.share({ files: [new File([blob], name, { type: 'image/png' })], title: k.titel });
      if (t === 'copy') { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); meldung('Image copied – paste it into Discord.'); }
      if (t === 'dl') { const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = name; a.click(); }
    } catch (err) { if (err.name !== 'AbortError') meldung(err.message, true); }
  };
}
