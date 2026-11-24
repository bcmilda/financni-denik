// Finanční deník · logic.js · v0.4.0
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

// ---------- v0.4: přehledy, pokladní kniha, ocenění ----------
const posunYm = (ym, n) => { const d = new Date(+ym.slice(0, 4), +ym.slice(5, 7) - 1 + n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
export { posunYm };

// Příjmy a výdaje po měsících (n měsíců končících ymDo)
export function mesice(S, ymDo, n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) { const ym = posunYm(ymDo, -i), l = monthE(S, ym); out.push({ ym, inc: sumT(l, 'p'), exp: sumT(l, 'v') }); }
  return out;
}
// Výdaje po kategoriích za období (včetně krajních měsíců) – [[kat, součet]] od největšího
export function katObdobi(S, ymOd, ymDo) {
  const m = {};
  vals(S.e).filter(e => e.typ === 'v' && mk(e.d) >= ymOd && mk(e.d) <= ymDo).forEach(e => { m[e.kat] = (m[e.kat] || 0) + e.kc; });
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}
// Souhrn měsíce s porovnáním na minulý
export function souhrnMesice(S, ym) {
  const l = monthE(S, ym), p = monthE(S, posunYm(ym, -1));
  const inc = sumT(l, 'p'), exp = sumT(l, 'v'), pInc = sumT(p, 'p'), pExp = sumT(p, 'v');
  const pct = (a, b) => (b > 0 ? Math.round((a - b) / b * 100) : null);
  return { inc, exp, zust: inc - exp, pInc, pExp, zInc: pct(inc, pInc), zExp: pct(exp, pExp), zZust: pInc - pExp !== 0 ? pct(inc - exp, pInc - pExp) : null, kats: katObdobi(S, ym, ym) };
}
// Stav peněz k začátku dne `datum` (bez něj) – všechny peněženky, nebo jedna
export function stavKDatu(S, datum, penId) {
  const pens = penId ? [penId] : Object.keys(S.pen || {});
  const start = pens.reduce((s, id) => s + (((S.pen || {})[id] || {}).start || 0), 0);
  return start + vals(S.e).filter(e => e.d < datum && (!penId || (e.pen || 'ucet') === penId)).reduce((s, e) => s + (e.typ === 'p' ? e.kc : -e.kc), 0);
}

// Ocenění: jen věci, které jdou poctivě spočítat z dat. Appka nikdy netrestá – nezískané jsou jen „zatím ne“.
export const OCENENI = [
  { id: 'prvni', n: 'První zápis', p: 'Zapsal/a jsi první pohyb peněz.', c: '#c9a227', i: 'pero' },
  { id: 'tyden', n: 'Týden v řadě', p: '7 dní za sebou aspoň jeden zápis.', c: '#2e8b6e', i: 'kalendar' },
  { id: 'plus', n: 'Měsíc v plusu', p: 'Uzavřený měsíc, kdy příjmy převýšily výdaje.', c: '#3d7ea6', i: 'mince' },
  { id: 'plan', n: 'Plán dodržen', p: 'Uzavřený měsíc s výdaji do zapsané predikce.', c: '#7b5ea7', i: 'fajfka' },
  { id: 'cil', n: 'Cíl splněn', p: 'Našetřeno na celý cíl.', c: '#d1495b', i: 'vlajka' },
  { id: 'pulcil', n: 'V půlce cesty', p: 'Polovina některého cíle je našetřená.', c: '#e8a33d', i: 'hora' },
  { id: 'ridic', n: 'Řidič s přehledem', p: '5 tankování se stavem tachometru.', c: '#30638e', i: 'auto' },
  { id: 'uctenky', n: 'Sběratel účtenek', p: '10 vlepených účtenek.', c: '#8d6a9f', i: 'uctenka' },
  { id: 'kronikar', n: 'Kronikář', p: '10 záznamů v Knize života.', c: '#b5838d', i: 'kniha' },
  { id: 'rok', n: 'Rok s deníkem', p: 'Rok od prvního zápisu.', c: '#a5262c', i: 'hvezda' },
];
export function oceneni(S, dnesD) {
  const e = vals(S.e).sort((a, b) => a.d.localeCompare(b.d)), ymNow = mk(dnesD), dny = [...new Set(e.map(x => x.d))].sort();
  const g = {};
  if (e.length) g.prvni = e[0].d;
  for (let i = 6; i < dny.length; i++) {
    const a = new Date(dny[i - 6]), b = new Date(dny[i]);
    if (Math.round((b - a) / 864e5) === 6) { g.tyden = dny[i]; break; }
  }
  const yms = [...new Set(e.map(x => mk(x.d)))].filter(ym => ym < ymNow).sort();
  for (const ym of yms) {
    const l = monthE(S, ym), inc = sumT(l, 'p'), exp = sumT(l, 'v');
    if (!g.plus && inc > exp && inc > 0) g.plus = ym + '-28';
    const pr = (S.pred || {})[ym];
    if (!g.plan && pr && exp <= pr.vydaje) g.plan = ym + '-28';
  }
  const cile = vals(S.cile);
  if (cile.some(c => c.cil > 0 && c.nasporeno >= c.cil)) g.cil = dnesD;
  if (cile.some(c => c.cil > 0 && c.nasporeno >= c.cil / 2)) g.pulcil = dnesD;
  const t = e.filter(x => x.tema === 'tank' && x.pole && x.pole.tach > 0);
  if (t.length >= 5) g.ridic = t[4].d;
  const s = vals(S.stk).sort((a, b) => a.d.localeCompare(b.d));
  if (s.length >= 10) g.uctenky = s[9].d;
  if (vals(S.zivot).length >= 10) g.kronikar = dnesD;
  if (e.length && (new Date(dnesD) - new Date(e[0].d)) / 864e5 >= 365) g.rok = dnesD;
  return OCENENI.map(o => ({ ...o, kdy: g[o.id] || null }));
}
