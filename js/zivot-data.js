// Finanční deník · zivot-data.js · v0.3.0
// Kniha života – čistá data a výpočty bez DOM (testy v tests/logic.test.mjs).
// Data: users/{uid}/osoby/{id} a users/{uid}/zivot/{id} (jeden záznam = jedna událost v životě osoby).

import { pd, uid } from './util.js';

// Druhy záznamů (barva = barva štítku na ose života)
export const TYPY = {
  udalost: { n: 'Událost', c: '#e07a5f' },
  etapa: { n: 'Etapa', c: '#3d7ea6' },
  poznamka: { n: 'Poznámka', c: '#8a8a8a' },
  lekar: { n: 'Lékař', c: '#2e8b6e' },
  ockovani: { n: 'Očkování', c: '#7b5ea7' },
  zub: { n: 'Zoubek', c: '#d4a017' },
  rust: { n: 'Růst', c: '#c45a8a' },
};
export const VZTAHY = { ja: 'Já', dite: 'Dítě', partner: 'Partner/ka', rodic: 'Rodič', jiny: 'Jiný' };

// Věk k datu: „6 let 4 měsíce“, „11 měsíců“, „3 týdny“
const pl = (n, a, b, c) => n + ' ' + (n === 1 ? a : n >= 2 && n <= 4 ? b : c);
export function vek(narozeni, datum) {
  if (!narozeni || !datum || datum < narozeni) return '';
  const a = pd(narozeni), b = pd(datum);
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) m--;
  if (m < 1) { const t = Math.floor((b - a) / 864e5 / 7); return t < 1 ? 'novorozenec' : pl(t, 'týden', 'týdny', 'týdnů'); }
  const r = Math.floor(m / 12), mm = m % 12;
  if (r === 0) return pl(mm, 'měsíc', 'měsíce', 'měsíců');
  return pl(r, 'rok', 'roky', 'let') + (mm && r < 6 ? ' ' + pl(mm, 'měsíc', 'měsíce', 'měsíců') : '');
}

// Zuby podle číslování FDI. Mléčné: kvadranty 5–8, pozice 1–5. Stálé: kvadranty 1–4, pozice 1–8.
const NAZ_M = ['řezák střední', 'řezák postranní', 'špičák', 'první stolička', 'druhá stolička'];
const NAZ_S = ['řezák střední', 'řezák postranní', 'špičák', 'první třenový zub', 'druhý třenový zub', 'první stolička', 'druhá stolička', 'zub moudrosti'];
const KVADR = { 1: 'vpravo nahoře', 2: 'vlevo nahoře', 3: 'vlevo dole', 4: 'vpravo dole', 5: 'vpravo nahoře', 6: 'vlevo nahoře', 7: 'vlevo dole', 8: 'vpravo dole' };
export function nazevZubu(kod) {
  const q = Math.floor(kod / 10), p = kod % 10, mlecny = q >= 5;
  return (mlecny ? NAZ_M : NAZ_S)[p - 1] + ' ' + KVADR[q] + (mlecny ? ' (mléčný)' : '');
}
// Pořadí zubů v oblouku z pohledu toho, kdo se dívá do pusy (pravá strana dítěte je vlevo)
export function oblouk(mlecne, horni) {
  const n = mlecne ? 5 : 8, [qa, qb] = mlecne ? (horni ? [5, 6] : [8, 7]) : (horni ? [1, 2] : [4, 3]);
  const a = [], b = [];
  for (let p = n; p >= 1; p--) a.push(qa * 10 + p);
  for (let p = 1; p <= n; p++) b.push(qb * 10 + p);
  return a.concat(b);
}
// Stav zubů osoby: { kod: { vypadl: datum, prorezal: datum, prvni: bool } }
export function stavZubu(zaznamy) {
  const st = {};
  zaznamy.filter(z => z.typ === 'zub' && z.zub).sort((a, b) => a.d.localeCompare(b.d)).forEach(z => {
    st[z.zub] = st[z.zub] || {};
    st[z.zub][z.akce === 'prorezal' ? 'prorezal' : 'vypadl'] = z.d;
  });
  const vyp = Object.entries(st).filter(([k, v]) => v.vypadl && +k >= 50).sort((a, b) => a[1].vypadl.localeCompare(b[1].vypadl));
  if (vyp.length) st[vyp[0][0]].prvni = true;
  return st;
}

// Ukázková Kniha života (režim bez účtu)
export function ukazkaZivota() {
  const osoby = {}, zivot = {};
  const os = (id, jmeno, narozeni, vztah) => { osoby[id] = { id, jmeno, narozeni, vztah }; };
  const z = (osoba, typ, d, o) => { const id = uid(); zivot[id] = { id, osoba, typ, d, ...o }; };
  os('ema', 'Ema', '2019-05-12', 'dite');
  os('ja', 'Já', '', 'ja');
  z('ema', 'etapa', '2022-09-01', { do: '2025-06-30', titul: 'Mateřská školka Sluníčko', text: 'Třída Berušky, paní učitelka Jana.' });
  z('ema', 'etapa', '2025-09-01', { do: '', titul: 'Základní škola', text: 'První třída, paní učitelka Marková.' });
  z('ema', 'etapa', '2023-01-10', { do: '2023-06-20', titul: 'Plavecký kurz', text: '' });
  z('ema', 'udalost', '2020-05-30', { titul: 'První krůčky', text: 'Doma v obýváku, od gauče ke mně.' });
  z('ema', 'udalost', '2020-03-14', { titul: 'První slovo', text: '„Máma“' });
  z('ema', 'poznamka', '2026-10-02', { titul: 'Co ji baví', text: 'Dinosauři, kreslení křídou a skákání přes švihadlo.' });
  z('ema', 'lekar', '2026-05-14', {
    titul: 'Preventivní prohlídka 7 let', lekar: 'MUDr. Nováková, pediatr', duvod: 'Pravidelná prohlídka',
    prepis: 'Somat. v normě, PMV odpovídá věku. TV 122 cm (P50), TH 23 kg (P50). Visus OU 1,0. Bez patol. nálezu. Kontrola za 2 r.',
    vysv: {
      text: 'Tělesný vývoj je v pořádku a duševní a pohybový vývoj (PMV) odpovídá věku. Výška 122 cm a váha 23 kg jsou přesně uprostřed mezi dětmi stejného věku (50. percentil). Zrak obou očí (OU) je plný, 1,0. Lékařka nenašla nic neobvyklého.',
      shrnuti: 'Podle zprávy je Ema zdravá a roste i vyvíjí se přiměřeně věku. Další prohlídka za 2 roky.',
      pojmy: [['PMV', 'psychomotorický vývoj – myšlení, řeč a pohyb'], ['P50', '50. percentil – polovina dětí je menší, polovina větší'], ['Visus OU', 'ostrost zraku obou očí']],
      otazky: [], ukazka: true,
    },
    pristi: '2028-05-14',
  });
  z('ema', 'lekar', '2025-11-18', {
    titul: 'ORL vyšetření', lekar: 'MUDr. Svoboda, ORL', duvod: 'Časté rýmy, chrápání',
    prepis: 'Adenoidní vegetace hypertrof., tonsily hypertrof. II. st. Tympanogram typ A bilat. Dop.: kontrola za 3 měs., zvážit AT.',
    vysv: {
      text: 'Nosní mandle (adenoidní vegetace) je zvětšená, a proto může Ema hůř dýchat nosem a v noci chrápat. Krční mandle (tonsily) jsou zvětšené do druhého stupně ze čtyř. Uši jsou v pořádku: tympanogram typu A na obou stranách znamená, že se ušní bubínky hýbou normálně a za nimi není tekutina.',
      shrnuti: 'Podle zprávy jsou zvětšené nosní i krční mandle, uši jsou v pořádku. Lékař doporučil kontrolu za 3 měsíce a zvážení odstranění nosní mandle.',
      pojmy: [['AT', 'adenotomie – odstranění nosní mandle'], ['bilat.', 'oboustranně'], ['hypertrof.', 'zvětšený']],
      otazky: ['Kdy je odstranění nosní mandle opravdu potřeba?', 'Co můžeme dělat doma, aby se Emě lépe dýchalo?'], ukazka: true,
    },
    pristi: '2026-02-18',
  });
  [['2019-07-15', 'Hexavalentní vakcína', 'záškrt, tetanus, černý kašel, dětská obrna, hepatitida B, Hib', '1. dávka'],
    ['2019-09-16', 'Hexavalentní vakcína', 'záškrt, tetanus, černý kašel, dětská obrna, hepatitida B, Hib', '2. dávka'],
    ['2020-05-18', 'Hexavalentní vakcína', 'záškrt, tetanus, černý kašel, dětská obrna, hepatitida B, Hib', '3. dávka'],
    ['2020-08-17', 'MMR', 'spalničky, příušnice, zarděnky', '1. dávka'],
    ['2024-09-09', 'MMR', 'spalničky, příušnice, zarděnky', '2. dávka'],
    ['2025-01-20', 'DTaP', 'záškrt, tetanus, černý kašel', 'přeočkování']]
    .forEach((r, i) => z('ema', 'ockovani', r[0], { latka: r[1], proti: r[2], davka: r[3], sarze: 'A' + (2310 + i * 37) + 'B', lekar: 'MUDr. Nováková' }));
  [['2025-09-03', 81, 'vypadl'], ['2025-10-20', 71, 'vypadl'], ['2026-02-11', 51, 'vypadl'], ['2026-03-02', 61, 'vypadl'],
    ['2025-06-10', 36, 'prorezal'], ['2025-06-24', 46, 'prorezal'], ['2025-11-05', 41, 'prorezal'], ['2025-12-12', 31, 'prorezal']]
    .forEach(([d, zub, akce]) => z('ema', 'zub', d, { zub, akce, text: zub === 81 ? 'Zoubková víla nechala 50 Kč.' : '' }));
  [['2020-05-12', 76, 10], ['2021-05-12', 87, 12.5], ['2022-05-12', 96, 14.5], ['2023-05-12', 103, 16.5], ['2024-05-12', 110, 18.5], ['2025-05-12', 116, 20.5], ['2026-05-14', 122, 23]]
    .forEach(([d, vyska, vaha]) => z('ema', 'rust', d, { vyska, vaha }));
  z('ja', 'lekar', '2026-03-09', { titul: 'Preventivní prohlídka', lekar: 'praktický lékař', duvod: 'Prohlídka po 2 letech', prepis: 'TK 128/82, P 68/min. Lab.: glykémie 5,1, chol. 5,4. Bez obtíží.', pristi: '2028-03-09' });
  z('ja', 'udalost', '2018-06-16', { titul: 'Svatba', text: '' });
  return { osoby, zivot };
}
