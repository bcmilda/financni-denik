// Finanční deník · nalepky.js · v0.7.0
// Nálepky a lepicí lístky (post-it), které se dají nalepit kamkoli do knihy a posouvat prstem.
// Data: nalepky/{id} = { id, kde ('den/2026-11-25', 'mesic/2026-11', …), s ('L'|'R'), druh ('postit' | id nálepky),
//        x (% šířky stránky), y (px od horního okraje stránky), r (otočení °), v (velikost 0.7–1.6), text, c (barva lístku) }

import { esc, uid, vals, mk, dnes } from './util.js';
import { pondeli } from './logic.js';
import { st, zapis } from './store.js';

const $ = s => document.querySelector(s);

// ---------- kresby nálepek (viewBox 0 0 64 64, bílý výsek dělá filtr #fd-vyrez v index.html) ----------
const K = {
  hvezda: '<path d="M32 6l7.6 15.6 17.2 2.4-12.5 12 3 17L32 44.8 16.7 53l3-17L7.2 24l17.2-2.4z" fill="#f6c343" stroke="#d6961c" stroke-width="2" stroke-linejoin="round"/><circle cx="27" cy="31" r="2.2" fill="#5a3a12"/><circle cx="37" cy="31" r="2.2" fill="#5a3a12"/><path d="M27.5 37q4.5 3.5 9 0" fill="none" stroke="#5a3a12" stroke-width="2" stroke-linecap="round"/>',
  srdce: '<path d="M32 55S8 41 8 24a12 12 0 0 1 24-4 12 12 0 0 1 24 4c0 17-24 31-24 31z" fill="#e8505b" stroke="#b8323d" stroke-width="2"/><path d="M17 22a6 6 0 0 1 6-6" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="3" stroke-linecap="round"/>',
  fajfka: '<circle cx="32" cy="32" r="24" fill="#4caf6a" stroke="#2f8049" stroke-width="2"/><path d="M20 33l8 8 16-17" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>',
  smajlik: '<circle cx="32" cy="32" r="24" fill="#ffd54a" stroke="#d9a520" stroke-width="2"/><circle cx="24" cy="27" r="3" fill="#5a3a12"/><circle cx="40" cy="27" r="3" fill="#5a3a12"/><path d="M21 37q11 11 22 0" fill="none" stroke="#5a3a12" stroke-width="3" stroke-linecap="round"/><circle cx="18" cy="35" r="3" fill="#ff8a7a" opacity=".6"/><circle cx="46" cy="35" r="3" fill="#ff8a7a" opacity=".6"/>',
  slunce: '<g stroke="#f2a024" stroke-width="4" stroke-linecap="round"><path d="M32 4v8M32 52v8M4 32h8M52 32h8M12 12l6 6M46 46l6 6M12 52l6-6M46 18l6-6"/></g><circle cx="32" cy="32" r="15" fill="#ffcf3f" stroke="#e59b1a" stroke-width="2"/><circle cx="27" cy="30" r="1.8" fill="#6b3f0c"/><circle cx="37" cy="30" r="1.8" fill="#6b3f0c"/><path d="M27 36q5 4 10 0" fill="none" stroke="#6b3f0c" stroke-width="2" stroke-linecap="round"/>',
  kytka: '<path d="M32 36v22" stroke="#3f8f4a" stroke-width="3.5" stroke-linecap="round"/><path d="M32 50q-10-2-12-10 9 0 12 10z" fill="#5cb85c"/><g fill="#f58fb6" stroke="#d6608c" stroke-width="1.5"><circle cx="32" cy="14" r="8"/><circle cx="44" cy="23" r="8"/><circle cx="40" cy="37" r="8"/><circle cx="24" cy="37" r="8"/><circle cx="20" cy="23" r="8"/></g><circle cx="32" cy="27" r="6.5" fill="#ffd54a" stroke="#d9a520" stroke-width="1.5"/>',
  duha: '<g fill="none" stroke-width="5"><path d="M8 44a24 24 0 0 1 48 0" stroke="#e8505b"/><path d="M13 44a19 19 0 0 1 38 0" stroke="#f6a33a"/><path d="M18 44a14 14 0 0 1 28 0" stroke="#f6d443"/><path d="M23 44a9 9 0 0 1 18 0" stroke="#4caf6a"/></g><path d="M4 50a6 6 0 0 1 8-7 6 6 0 0 1 10 3 5 5 0 0 1-1 9H8a5 5 0 0 1-4-5zM42 50a6 6 0 0 1 8-7 6 6 0 0 1 10 3 5 5 0 0 1-1 9H46a5 5 0 0 1-4-5z" fill="#fff" stroke="#b8c6d3" stroke-width="1.5"/>',
  medaile: '<path d="M22 6h8l4 18h-8zM42 6h-8l-4 18h8z" fill="#3d7ea6"/><path d="M26 6h4l4 18h-4z" fill="#e8505b"/><circle cx="32" cy="40" r="16" fill="#f6c343" stroke="#c98a17" stroke-width="2"/><circle cx="32" cy="40" r="11" fill="none" stroke="#c98a17" stroke-width="1.5"/><path d="M32 33l2.3 4.7 5.2.7-3.8 3.6.9 5.1L32 44.7l-4.6 2.4.9-5.1-3.8-3.6 5.2-.7z" fill="#fff6d0"/>',
  prasatko: '<ellipse cx="32" cy="36" rx="22" ry="17" fill="#f6a8bd" stroke="#d6738f" stroke-width="2"/><path d="M18 24l-3-10 10 6z" fill="#f6a8bd" stroke="#d6738f" stroke-width="2" stroke-linejoin="round"/><ellipse cx="53" cy="37" rx="5" ry="6" fill="#f08aa6" stroke="#d6738f" stroke-width="1.5"/><circle cx="52" cy="35" r="1" fill="#8a3550"/><circle cx="52" cy="39" r="1" fill="#8a3550"/><circle cx="42" cy="30" r="2.2" fill="#5a2338"/><path d="M26 21h12" stroke="#8a3550" stroke-width="3" stroke-linecap="round"/><path d="M18 51v6M26 52v6M38 52v6M46 51v6" stroke="#d6738f" stroke-width="5" stroke-linecap="round"/><path d="M10 34q-6-2-4-8" fill="none" stroke="#d6738f" stroke-width="2" stroke-linecap="round"/><circle cx="32" cy="10" r="7" fill="#f6c343" stroke="#c98a17" stroke-width="1.5"/>',
  mince: '<circle cx="32" cy="32" r="24" fill="#f6c343" stroke="#c98a17" stroke-width="2.5"/><circle cx="32" cy="32" r="18" fill="none" stroke="#c98a17" stroke-width="1.5" stroke-dasharray="2 3"/><text x="32" y="40" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#8a5a0c">Kč</text>',
  penize: '<rect x="8" y="22" width="48" height="26" rx="3" fill="#7cc08a" stroke="#3f8f4a" stroke-width="2" transform="rotate(-8 32 35)"/><rect x="8" y="18" width="48" height="26" rx="3" fill="#9ad3a5" stroke="#3f8f4a" stroke-width="2"/><circle cx="32" cy="31" r="7" fill="none" stroke="#3f8f4a" stroke-width="2"/><text x="32" y="34.5" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="9" fill="#2c6b37">Kč</text><path d="M13 22v4M51 36v4" stroke="#3f8f4a" stroke-width="2"/>',
  kosik: '<path d="M6 12h8l6 28h28l6-20H17" fill="none" stroke="#3d7ea6" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 20h36l-6 20H22z" fill="#bfe0f5"/><circle cx="24" cy="50" r="4.5" fill="#3d7ea6"/><circle cx="44" cy="50" r="4.5" fill="#3d7ea6"/><circle cx="30" cy="18" r="5" fill="#e8505b"/><path d="M38 9l4 12" stroke="#f2a024" stroke-width="5" stroke-linecap="round"/>',
  dum: '<path d="M10 30L32 10l22 20v24H10z" fill="#f4e3c2" stroke="#9a6b3a" stroke-width="2" stroke-linejoin="round"/><path d="M6 32L32 8l26 24" fill="none" stroke="#c0392b" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><rect x="27" y="38" width="10" height="16" fill="#9a6b3a"/><rect x="15" y="34" width="8" height="8" fill="#9fd1f2" stroke="#9a6b3a" stroke-width="1.5"/><rect x="41" y="34" width="8" height="8" fill="#9fd1f2" stroke="#9a6b3a" stroke-width="1.5"/><path d="M44 18v-8h5v12" fill="#c0392b"/>',
  auto: '<path d="M6 40v-8l7-3 6-9h22l9 9 8 3v8z" fill="#e8505b" stroke="#a8323c" stroke-width="2" stroke-linejoin="round"/><path d="M22 23h8v7H17zM34 23h6l6 7H34z" fill="#bfe3ff"/><circle cx="18" cy="42" r="6" fill="#333"/><circle cx="18" cy="42" r="2.5" fill="#ccc"/><circle cx="46" cy="42" r="6" fill="#333"/><circle cx="46" cy="42" r="2.5" fill="#ccc"/><rect x="54" y="33" width="4" height="3" rx="1" fill="#ffd54a"/>',
  benzin: '<rect x="12" y="10" width="26" height="44" rx="3" fill="#f2a024" stroke="#b86e0c" stroke-width="2"/><rect x="17" y="15" width="16" height="11" rx="1.5" fill="#fff4d8"/><path d="M38 22h5l6 6v18a3 3 0 0 1-6 0V36h-5" fill="none" stroke="#555" stroke-width="3" stroke-linejoin="round"/><path d="M25 34q-5 7 0 10 5-3 0-10z" fill="#3d7ea6"/><rect x="9" y="52" width="32" height="5" rx="1.5" fill="#8a5a3c"/>',
  kava: '<path d="M12 24h32v14a14 14 0 0 1-14 14h-4a14 14 0 0 1-14-14z" fill="#f4ede2" stroke="#8a5a3c" stroke-width="2.5"/><path d="M44 28h4a6 6 0 0 1 0 12h-5" fill="none" stroke="#8a5a3c" stroke-width="3"/><path d="M15 27h26" stroke="#6b3f22" stroke-width="4" stroke-linecap="round"/><path d="M22 18q-3-4 0-8M30 18q-3-4 0-8M38 18q-3-4 0-8" fill="none" stroke="#b39b84" stroke-width="2" stroke-linecap="round"/><path d="M8 54h40" stroke="#8a5a3c" stroke-width="3" stroke-linecap="round"/><path d="M24 38q4-4 8 0q-4 6-8 0z" fill="#e8505b"/>',
  dort: '<rect x="12" y="34" width="40" height="18" rx="3" fill="#f6c6d6" stroke="#c96b8c" stroke-width="2"/><path d="M12 40q5 5 10 0t10 0 10 0 10 0" fill="none" stroke="#fff" stroke-width="3"/><rect x="16" y="24" width="32" height="12" rx="2" fill="#fff3e0" stroke="#c9a67a" stroke-width="2"/><rect x="30" y="12" width="4" height="12" rx="1" fill="#79b8e8"/><path d="M32 4q-4 5 0 8 4-3 0-8z" fill="#f6a33a"/><path d="M8 54h48" stroke="#9a7a5a" stroke-width="3" stroke-linecap="round"/><circle cx="22" cy="29" r="2" fill="#e8505b"/><circle cx="42" cy="29" r="2" fill="#e8505b"/>',
  darek: '<rect x="10" y="26" width="44" height="28" rx="2" fill="#e8505b" stroke="#a8323c" stroke-width="2"/><rect x="7" y="19" width="50" height="10" rx="2" fill="#f2646e" stroke="#a8323c" stroke-width="2"/><path d="M29 19h6v35h-6z" fill="#f6c343"/><path d="M32 19c-10-1-14-12-7-12 4 0 6 6 7 12zM32 19c10-1 14-12 7-12-4 0-6 6-7 12z" fill="#f6c343" stroke="#c98a17" stroke-width="1.5"/>',
  zub: '<path d="M18 10c6-3 10 1 14 1s8-4 14-1c7 4 6 14 3 22l-3 18c-1 6-6 6-7 0l-2-10c-1-4-3-4-4 0l-2 10c-1 6-6 6-7 0l-3-18c-3-8-4-18 3-22z" fill="#fff" stroke="#9db4c8" stroke-width="2.2" stroke-linejoin="round"/><circle cx="26" cy="23" r="2" fill="#3a3a3a"/><circle cx="38" cy="23" r="2" fill="#3a3a3a"/><path d="M27 29q5 4 10 0" fill="none" stroke="#3a3a3a" stroke-width="2" stroke-linecap="round"/><circle cx="21" cy="27" r="2.5" fill="#ff9fb0" opacity=".7"/><circle cx="43" cy="27" r="2.5" fill="#ff9fb0" opacity=".7"/><path d="M50 8l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z" fill="#f6c343"/>',
  naplast: '<rect x="4" y="22" width="56" height="20" rx="10" fill="#f2c79b" stroke="#c48a55" stroke-width="2" transform="rotate(-30 32 32)"/><rect x="22" y="22" width="20" height="20" rx="3" fill="#e9b07c" transform="rotate(-30 32 32)"/><g fill="#c48a55" transform="rotate(-30 32 32)"><circle cx="28" cy="28" r="1.2"/><circle cx="36" cy="28" r="1.2"/><circle cx="28" cy="36" r="1.2"/><circle cx="36" cy="36" r="1.2"/><circle cx="32" cy="32" r="1.2"/></g><path d="M47 12q2-5 6-3-1 5-6 3z" fill="#e8505b"/>',
  balonky: '<path d="M22 38q2 10-2 20M42 36q-2 12 4 22" fill="none" stroke="#777" stroke-width="1.5"/><ellipse cx="22" cy="24" rx="12" ry="15" fill="#e8505b" stroke="#a8323c" stroke-width="2"/><ellipse cx="42" cy="22" rx="12" ry="15" fill="#3d7ea6" stroke="#265a7c" stroke-width="2"/><path d="M17 16q2-5 6-6M37 14q2-5 6-6" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2.5" stroke-linecap="round"/><path d="M20 39l2-2 2 2zM40 37l2-2 2 2z" fill="#555"/>',
  stromek: '<path d="M32 4L14 28h8L10 44h12L8 56h48L42 44h12L42 28h8z" fill="#3f8f4a" stroke="#2b6634" stroke-width="2" stroke-linejoin="round"/><rect x="28" y="56" width="8" height="6" fill="#8a5a3c"/><path d="M32 0l2 4 4 .5-3 3 1 4-4-2-4 2 1-4-3-3 4-.5z" fill="#f6c343"/><circle cx="24" cy="38" r="2.6" fill="#e8505b"/><circle cx="38" cy="32" r="2.6" fill="#f6c343"/><circle cx="40" cy="50" r="2.6" fill="#79b8e8"/><circle cx="22" cy="51" r="2.6" fill="#f6c343"/><circle cx="30" cy="22" r="2.4" fill="#79b8e8"/>',
  palma: '<circle cx="48" cy="14" r="7" fill="#ffcf3f"/><path d="M4 54q28-12 56 0v6H4z" fill="#f4d58d" stroke="#d1a94f" stroke-width="1.5"/><path d="M30 54q2-18-4-30" fill="none" stroke="#8a5a3c" stroke-width="4" stroke-linecap="round"/><g fill="#4caf6a" stroke="#2f8049" stroke-width="1.5" stroke-linejoin="round"><path d="M26 24q-12-6-20 2 10-2 20-2z"/><path d="M26 24q-4-12-16-12 10 4 16 12z"/><path d="M26 24q8-12 20-8-12 0-20 8z"/><path d="M26 24q12 0 16 10-8-8-16-10z"/></g><path d="M4 58q8-3 16 0t16 0 16 0 12 0" fill="none" stroke="#5aaee0" stroke-width="2"/>',
};
const NAPISY = {
  n_super: ['Super!', '#e8505b'], n_usetreno: ['Ušetřeno', '#3e9b5a'], n_vyplata: ['Výplata!', '#3d7ea6'], n_bezutraceni: ['Bez utrácení', '#2e8b6e'],
  n_pozor: ['Pozor', '#e58a1f'], n_splneno: ['Splněno', '#7b5ea7'], n_hura: ['Hurá!', '#d4a017'], n_dovolena: ['Dovolená', '#1f9bb5'],
};
export const ARCHY = [
  { id: 'zaklad', n: 'Základní', l: ['hvezda', 'srdce', 'fajfka', 'smajlik', 'slunce', 'kytka', 'duha', 'medaile'] },
  { id: 'penize', n: 'Peníze', l: ['prasatko', 'mince', 'penize', 'kosik', 'n_usetreno', 'n_vyplata', 'n_bezutraceni', 'n_super'] },
  { id: 'domov', n: 'Domov a cesty', l: ['dum', 'auto', 'benzin', 'kava', 'palma', 'n_dovolena', 'n_pozor', 'n_splneno'] },
  { id: 'rodina', n: 'Rodina a svátky', l: ['zub', 'naplast', 'dort', 'darek', 'balonky', 'stromek', 'n_hura', 'srdce'] },
];
export const LISTKY = [['zluty', '#fff08a'], ['ruzovy', '#ffc4d6'], ['zeleny', '#c8f0a8'], ['modry', '#bfe3ff'], ['oranzovy', '#ffd29a']];
const NAZVY = { hvezda: 'hvězda', srdce: 'srdce', fajfka: 'fajfka', smajlik: 'smajlík', slunce: 'sluníčko', kytka: 'kytička', duha: 'duha', medaile: 'medaile', prasatko: 'prasátko', mince: 'mince', penize: 'bankovky', kosik: 'nákupní košík', dum: 'domeček', auto: 'auto', benzin: 'benzinka', kava: 'káva', dort: 'dort', darek: 'dárek', zub: 'zoubek', naplast: 'náplast', balonky: 'balonky', stromek: 'stromeček', palma: 'palma' };
export const nazevNalepky = id => NAPISY[id] ? NAPISY[id][0] : NAZVY[id] || 'nálepka';

export function nalepkaSvg(id, w) {
  const W = w || 64;
  if (NAPISY[id]) {
    const [t, c] = NAPISY[id], sir = Math.max(64, t.length * 11 + 22);
    return '<svg viewBox="0 0 ' + sir + ' 40" width="' + Math.round(W * sir / 64) + '" height="' + Math.round(W * 40 / 64) + '" aria-hidden="true"><g filter="url(#fd-vyrez)"><rect x="5" y="5" width="' + (sir - 10) + '" height="30" rx="15" fill="' + c + '"/><text x="' + sir / 2 + '" y="27" text-anchor="middle" font-family="Caveat,cursive" font-weight="700" font-size="22" fill="#fff">' + esc(t) + '</text></g></svg>';
  }
  return '<svg viewBox="0 0 64 64" width="' + W + '" height="' + W + '" aria-hidden="true"><g filter="url(#fd-vyrez)">' + (K[id] || K.hvezda) + '</g></svg>';
}

// Kam nálepka patří: ke dni, měsíci, týdnu, roku nebo ke stránce
export function kdeKlic(U) {
  const v = U.view === 'ukoly' ? 'cile' : U.view;
  if (v === 'den') return 'den/' + U.day;
  if (['mesic', 'prehled', 'pokladni', 'grafy'].includes(v)) return v + '/' + mk(U.day);
  if (v === 'tyden') return 'tyden/' + (U.tyden || pondeli(dnes()));
  if (v === 'rok') return 'rok/' + (U.rok || dnes().slice(0, 4));
  if (v === 'zivot') return 'zivot/' + (U.osoba || '');
  return v;
}

// Vrstva nálepek nad stránkou (volá se po každém vykreslení)
export function vlozNalepky(S, U) {
  const kde = kdeKlic(U), vse = vals(S.nalepky || {}).filter(n => n.kde === kde);
  ['L', 'R'].forEach(s => {
    const page = s === 'L' ? $('#pL') : $('#pR');
    const v = document.createElement('div'); v.className = 'nal-vrstva';
    v.innerHTML = vse.filter(n => n.s === s).map(n => nalHTML(n, U.nalSel === n.id)).join('');
    page.appendChild(v);
  });
}
function nalHTML(n, sel) {
  const tr = 'transform:translate(-50%,-50%) rotate(' + (n.r || 0) + 'deg) scale(' + (n.v || 1) + ')';
  // Lišta je mimo nálepku, aby se neotáčela a nezvětšovala s ní
  const dole = n.druh === 'postit' ? 80 : 50;
  const lista = sel ? '<div class="nal-lista" role="toolbar" aria-label="Upravit nálepku" style="left:clamp(112px,' + n.x + '%,calc(100% - 112px));top:' + (n.y + dole * (n.v || 1) + 14) + 'px"><button data-act="nrot" data-id="' + n.id + '" aria-label="Otočit">↻</button><button data-act="nvel" data-id="' + n.id + '" data-v="1" aria-label="Zvětšit">＋</button><button data-act="nvel" data-id="' + n.id + '" data-v="-1" aria-label="Zmenšit">−</button><button data-act="ndel" data-id="' + n.id + '">Odlepit</button></div>' : '';
  if (n.druh === 'postit') {
    const c = (LISTKY.find(x => x[0] === n.c) || LISTKY[0])[1];
    return '<div class="nal postit' + (sel ? ' sel' : '') + '" data-nal="' + n.id + '" tabindex="0" style="left:' + n.x + '%;top:' + n.y + 'px;--pc:' + c + ';' + tr + '"><span class="pin" aria-hidden="true"></span>' +
      '<div class="pt-text hand" ' + (sel ? 'contenteditable="true" ' : '') + 'data-ptid="' + n.id + '" role="textbox" aria-label="Text lístku" data-ph="Napiš…">' + esc(n.text || '') + '</div></div>' + lista;
  }
  return '<div class="nal' + (sel ? ' sel' : '') + '" data-nal="' + n.id + '" tabindex="0" role="img" aria-label="Nálepka ' + esc(nazevNalepky(n.druh)) + '" style="left:' + n.x + '%;top:' + n.y + 'px;' + tr + '">' + nalepkaSvg(n.druh, 74) + '</div>' + lista;
}

// ---------- arch nálepek (výběr) ----------
export function otevritArch(U, ctx) {
  const el = $('#arch'); if (!el) return;
  const a = ARCHY.find(x => x.id === U.arch) || ARCHY[0];
  el.innerHTML = '<div class="arch-papir"><div class="arch-h"><h2 class="pt" id="archT">Nálepky</h2><button class="arw" data-ar="zavri" aria-label="Zavřít">×</button></div>' +
    '<div class="tags" role="tablist">' + ARCHY.map(x => '<button class="tg ' + (x.id === a.id ? 'on' : '') + '" role="tab" aria-selected="' + (x.id === a.id) + '" data-ar="arch" data-id="' + x.id + '">' + x.n + '</button>').join('') + '</div>' +
    '<div class="arch-mriz">' + a.l.map(id => '<button class="arch-n" data-ar="nalep" data-id="' + id + '" aria-label="Nalepit: ' + esc(nazevNalepky(id)) + '">' + nalepkaSvg(id, 58) + '</button>').join('') + '</div>' +
    '<h3 class="sub">Lepicí lístek</h3><div class="arch-listky">' + LISTKY.map(([id, c]) => '<button class="arch-l" data-ar="listek" data-id="' + id + '" style="--pc:' + c + '" aria-label="Nalepit lístek: ' + id + '"><span class="hand">Napiš…</span></button>').join('') + '</div>' +
    '<p class="note2">Nálepka se přilepí doprostřed stránky, kterou máš před sebou. Pak ji posuň prstem nebo myší; klepnutím ji otočíš, zvětšíš nebo odlepíš.</p></div>';
  el.hidden = false;
  el.querySelector('.arch-n').focus();
  el.onclick = ev => {
    if (ev.target === el) { el.hidden = true; return; }
    const b = ev.target.closest('[data-ar]'); if (!b) return;
    const co = b.dataset.ar;
    if (co === 'zavri') { el.hidden = true; return; }
    if (co === 'arch') { U.arch = b.dataset.id; otevritArch(U, ctx); return; }
    el.hidden = true;
    nalepit(U, co === 'listek' ? 'postit' : b.dataset.id, co === 'listek' ? b.dataset.id : '', ctx);
  };
}
function nalepit(U, druh, barva, ctx) {
  // Stránka, která je nejvíc vidět (na telefonu jsou pod sebou); na počítači pravá
  const vid = r => Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) * Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
  const rL = $('#pL').getBoundingClientRect(), rR = $('#pR').getBoundingClientRect(), s = vid(rR) >= vid(rL) ? 'R' : 'L', r = s === 'R' ? rR : rL, id = uid();
  const stred = (Math.max(r.top, 0) + Math.min(r.bottom, innerHeight)) / 2 - r.top;
  const n = { id, kde: kdeKlic(U), s, druh, x: Math.round(35 + Math.random() * 30), y: Math.max(60, Math.round(stred)), r: Math.round(Math.random() * 20 - 10), v: 1 };
  if (druh === 'postit') { n.c = barva || 'zluty'; n.text = ''; n.r = Math.round(Math.random() * 6 - 3); }
  zapis(['nalepky', id], n);
  U.nalSel = druh === 'postit' ? id : '';
  ctx.zvuk('nalepka');
  ctx.render();
  if (druh === 'postit') { const t = document.querySelector('[data-ptid="' + id + '"]'); if (t) t.focus(); }
}

export function nalepkyAkce(a, t, U, ctx) {
  const id = t.dataset.id, n = (st.S.nalepky || {})[id];
  switch (a) {
    case 'nalarch': otevritArch(U, ctx); return 'stop';
    case 'nrot': if (n) zapis(['nalepky', id, 'r'], ((n.r || 0) + 15 + 180) % 360 - 180); return true;
    case 'nvel': if (n) zapis(['nalepky', id, 'v'], Math.max(0.7, Math.min(1.6, Math.round(((n.v || 1) + 0.15 * +t.dataset.v) * 100) / 100))); return true;
    case 'ndel': {
      if (!n) return true;
      zapis(['nalepky', id], null); U.nalSel = '';
      ctx.toast(n.druh === 'postit' ? 'Lístek odlepen.' : 'Nálepka odlepena.', { n: 'Vrátit', f: () => { zapis(['nalepky', id], n); ctx.render(); } });
      return true;
    }
  }
  return false;
}

// ---------- posouvání prstem / myší ----------
export function initNalepky(U, ctx) {
  let tah = null;
  document.addEventListener('pointerdown', ev => {
    const el = ev.target.closest('.nal'); if (!el) return;
    if (ev.target.closest('.pt-text[contenteditable]')) return; // psaní do lístku
    const page = el.closest('.page'), r = page.getBoundingClientRect();
    tah = { el, id: el.dataset.nal, page, r, x0: ev.clientX, y0: ev.clientY, moved: false, sx: parseFloat(el.style.left), sy: parseFloat(el.style.top), pid: ev.pointerId };
    el.setPointerCapture(ev.pointerId);
    ev.preventDefault();
  });
  document.addEventListener('pointermove', ev => {
    if (!tah || ev.pointerId !== tah.pid) return;
    const dx = ev.clientX - tah.x0, dy = ev.clientY - tah.y0;
    if (!tah.moved && Math.hypot(dx, dy) < 5) return;
    tah.moved = true; tah.el.classList.add('tah');
    tah.nx = Math.max(2, Math.min(98, tah.sx + dx / tah.r.width * 100));
    tah.ny = Math.max(10, Math.min(tah.r.height - 10, tah.sy + dy));
    tah.el.style.left = tah.nx + '%'; tah.el.style.top = tah.ny + 'px';
    const l = tah.el.nextElementSibling; if (l && l.classList.contains('nal-lista')) l.hidden = true;
  });
  const konec = ev => {
    if (!tah || ev.pointerId !== tah.pid) return;
    const t0 = tah; tah = null; t0.el.classList.remove('tah');
    if (t0.moved) { zapis(['nalepky', t0.id, 'x'], Math.round(t0.nx * 10) / 10); zapis(['nalepky', t0.id, 'y'], Math.round(t0.ny)); return; }
    U.nalSel = U.nalSel === t0.id ? '' : t0.id; ctx.render();
    if (U.nalSel) { const t = document.querySelector('[data-ptid="' + t0.id + '"]'); if (t) t.focus(); else { const e = document.querySelector('[data-nal="' + t0.id + '"]'); if (e) e.focus(); } }
  };
  document.addEventListener('pointerup', konec);
  document.addEventListener('pointercancel', konec);
  // Klepnutí mimo nálepku zruší výběr
  document.addEventListener('pointerdown', ev => {
    if (U.nalSel && !ev.target.closest('.nal,.nal-lista,#arch,#toast')) { U.nalSel = ''; const a = document.activeElement; if (a && a.dataset && a.dataset.ptid) a.blur(); setTimeout(() => ctx.render(), 0); }
  }, true);
  // Text lístku se uloží při opuštění
  document.addEventListener('focusout', ev => {
    const t = ev.target; if (!t.dataset || !t.dataset.ptid) return;
    const v = t.innerText.replace(/\s+$/, '').slice(0, 400), n = (st.S.nalepky || {})[t.dataset.ptid];
    if (n && v !== (n.text || '')) zapis(['nalepky', t.dataset.ptid, 'text'], v);
  });
  // Klávesnice: šipky posouvají vybranou nálepku, Delete ji odlepí
  document.addEventListener('keydown', ev => {
    const el = ev.target.closest && ev.target.closest('.nal'); if (!el || ev.target.isContentEditable) return;
    const n = (st.S.nalepky || {})[el.dataset.nal]; if (!n) return;
    const kroky = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }[ev.key];
    if (kroky) { ev.preventDefault(); zapis(['nalepky', n.id, 'x'], Math.max(2, Math.min(98, n.x + kroky[0]))); zapis(['nalepky', n.id, 'y'], Math.max(10, n.y + kroky[1])); U.nalSel = n.id; ctx.render(); document.querySelector('[data-nal="' + n.id + '"]').focus(); }
    else if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); U.nalSel = U.nalSel === n.id ? '' : n.id; ctx.render(); const e = document.querySelector('[data-nal="' + n.id + '"]'); if (e) e.focus(); }
    else if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); nalepkyAkce('ndel', { dataset: { id: n.id } }, U, ctx); ctx.render(); }
  });
}
