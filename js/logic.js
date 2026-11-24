// Finanční deník · logic.js · v0.3.0
// Čistá logika bez DOM: rozpoznání zápisu, tankování, součty, hledání.
// Testy: tests/logic.test.mjs (node tests/logic.test.mjs)

import { esc, num, mk, vals } from './util.js';

// Slova → odhad kategorie (uživatel ji vždy může změnit)
export const GUESS = [
  [/tank|benz[ií]n|nafta|lpg|shell|omv|\bmol\b/i, 'auto'],
  [/k[aá]v|kafe|pizz|ob[eě]d|ve[cč]e[rř]|restaura|kebab|mcdon|hospod|pivo/i, 'rest'],
  [/lidl|kaufland|albert|penny|billa|tesco|globus|n[aá]kup|potrav/i, 'jidlo'],
  [/l[eé]k[aá]rn|doktor|zub/i, 'zdravi'],
  [/n[aá]jem|elekt|plyn|voda|energi/i, 'byd'],
  [/netflix|spotify|p[rř]edplat|youtube|hbo/i, 'predpl'],
  [/kino|divadl|koncert/i, 'zab'],
  [/v[yý]plat|mzda/i, 'vypl'],
  [/d[aá]rek|narozen/i, 'dary'],
  [/bot[yu]|bund|trik|kalhot/i, 'obl'],
];

const CISLO = '(\\d{1,3}(?:[ \\u00a0]\\d{3})+|\\d+)';

// „Tankování 20 l za 750 Kč, nájezd 83 087 km #výlet“ → částka, litry, km, tagy, kategorie
export function parse(text) {
  const t = String(text || '');
  const tagy = [...t.matchAll(/#([\p{L}\d_-]+)/gu)].map(m => m[1].toLowerCase());
  const clean = t.replace(/#[\p{L}\d_-]+/gu, '').replace(/\s+/g, ' ').trim();
  const tank = /tank/i.test(clean);
  const mL = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:l|litr\w*)(?![\p{L}])/iu);
  const mK = clean.match(new RegExp(CISLO + '(?:[.,](\\d+))?\\s*(?:kč|kc|,-)', 'i'));
  const mKm = clean.match(new RegExp(CISLO + '\\s*km(?![\\p{L}])', 'iu'));
  let amt = mK ? num(mK[1] + (mK[2] ? '.' + mK[2] : '')) : NaN, txt = clean;
  if (isNaN(amt) && !tank) {
    const mT = clean.match(/(\d{1,3}(?:[  ]\d{3})+|\d+(?:[.,]\d+)?)\s*$/);
    if (mT) { amt = num(mT[1]); txt = clean.slice(0, mT.index).trim(); }
  }
  let kat = '';
  for (const r of GUESS) if (r[0].test(clean)) { kat = r[1]; break; }
  return { tagy, text: txt || clean, amt, tank, litry: mL ? num(mL[1]) : NaN, km: mKm ? num(mKm[1]) : NaN, kat };
}

// Spotřeba klouzavě (princip z FinanceFlow vozidla.js): litry natankované po prvním
// stavu tachometru ÷ km mezi prvním a posledním stavem. Plná nádrž není nutná.
export function tankStats(list) {
  const z = list.filter(e => e.pole && e.pole.tach > 0 && e.pole.litry > 0).sort((a, b) => a.pole.tach - b.pole.tach);
  const seg = [];
  for (let i = 1; i < z.length; i++) {
    const km = z[i].pole.tach - z[i - 1].pole.tach;
    if (km > 0) seg.push({ e: z[i], km, sp: z[i].pole.litry / km * 100 });
  }
  const km = z.length > 1 ? z[z.length - 1].pole.tach - z[0].pole.tach : 0;
  const l = z.slice(1).reduce((s, x) => s + x.pole.litry, 0);
  const k = z.slice(1).reduce((s, x) => s + x.kc, 0);
  return {
    z, seg, km,
    avg: km > 0 ? l / km * 100 : NaN,
    kckm: km > 0 ? k / km : NaN,
    litry: z.reduce((s, x) => s + x.pole.litry, 0),
    kc: z.reduce((s, x) => s + x.kc, 0),
  };
}

// Kontrola tachometru: nový stav nesmí být nižší než u dřívějšího tankování téhož vozidla
export function tachOk(list, datum, tach) {
  return !list.some(e => e.pole && e.pole.tach > 0 && ((e.d < datum && e.pole.tach > tach) || (e.d > datum && e.pole.tach < tach)));
}

export const sumT = (l, t) => l.filter(e => e.typ === t).reduce((s, e) => s + (e.kc || 0), 0);
export const monthE = (S, ym) => vals(S.e).filter(e => mk(e.d) === ym);

// Zůstatek peněženky = počáteční stav + příjmy − výdaje (převody zatím ne)
export function zustatek(S, penId) {
  const p = (S.pen || {})[penId];
  if (!p) return 0;
  return (p.start || 0) + vals(S.e).filter(e => (e.pen || 'ucet') === penId).reduce((s, e) => s + (e.typ === 'p' ? e.kc : -e.kc), 0);
}

// Zápisek: {{y|text}} = zvýrazněný text (y/p/g/b/o = barva zvýrazňovače)
export const deser = s => esc(s || '').replace(/\{\{([ypgbo])\|([^}]*)\}\}/g, '<mark class="hl" data-c="$1">$2</mark>').replace(/\n/g, '<br>');
export const plain = s => String(s || '').replace(/\{\{[ypgbo]\|([^}]*)\}\}/g, '$1');

// Hledání napříč zápisy, zápisky, účtenkami a úkoly (bez diakritiky, bez velikosti písmen)
const fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export function hledej(S, q) {
  const f = fold(q).trim();
  if (f.length < 2) return [];
  const out = [];
  vals(S.e).forEach(e => { if (fold(e.text + ' ' + (e.tagy || []).map(t => '#' + t).join(' ')).includes(f)) out.push({ typ: 'e', d: e.d, e }); });
  Object.entries(S.notes || {}).forEach(([d, n]) => { const p = plain(n); const i = fold(p).indexOf(f); if (i >= 0) out.push({ typ: 'n', d, text: p.slice(Math.max(0, i - 40), i + 80) }); });
  vals(S.stk).forEach(s => { const t = (s.obchod || '') + ' ' + (s.pol || []).map(p => p[0]).join(' '); if (fold(t).includes(f)) out.push({ typ: 's', d: s.d, s }); });
  vals(S.ukoly).forEach(u => { if (fold(u.text).includes(f)) out.push({ typ: 'u', d: u.termin || (u.mesic + '-01'), u }); });
  vals(S.zivot).forEach(z => { const t = [z.titul, z.text, z.lekar, z.duvod, z.prepis, z.latka, z.proti, z.vysv && z.vysv.text, z.vysv && z.vysv.shrnuti].filter(Boolean).join(' '); if (fold(t).includes(f)) out.push({ typ: 'z', d: z.d, z }); });
  return out.sort((a, b) => b.d.localeCompare(a.d));
}
