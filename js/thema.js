// Aussehen: „Destiny OG“ (ruhig, fast farblos wie das Spielmenü) oder „Colorful“ (violette Flächen, farbige Leiste).
// Gilt für dieses Gerät; das Inline-Skript in index.html setzt es schon vor dem ersten Zeichnen.
export const THEMEN = [['bunt', 'Colorful', 'Violet surfaces and colored navigation (default)'], ['og', 'Destiny OG', 'Calm grey, near-monochrome, like the in-game menus']];
export function thema() { try { return localStorage.getItem('d2a.theme') || 'bunt'; } catch { return 'bunt'; } }
export function setzeThema(t) {
  try { localStorage.setItem('d2a.theme', t); } catch {}
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', t === 'og' ? '#0b0d10' : '#0b0a1a');
}
// Knopfreihe zum Umschalten (Konto und Willkommen nutzen dieselbe).
export function themaKnoepfe() {
  const an = thema();
  return `<div class="thema-wahl" role="radiogroup" aria-label="Look">${THEMEN.map(([c, n, d]) => `<button type="button" role="radio" aria-checked="${c === an}" data-thema="${c}" class="${c === an ? 'an' : ''}"><span class="th-probe th-${c}"><i></i><i></i><i></i></span><b>${n}</b><small>${d}</small></button>`).join('')}</div>`;
}
export function verbindeThema(el) {
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-thema]'); if (!b) return;
    setzeThema(b.dataset.thema);
    el.querySelectorAll('[data-thema]').forEach((x) => { const a = x === b; x.classList.toggle('an', a); x.setAttribute('aria-checked', a); });
  });
}
