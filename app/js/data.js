// Finanční deník · data.js · v0.1.0
// Vzhledy, písma, výchozí kategorie, prázdný deník a ukázkový měsíc.

import { iso, addD, mk, p2, uid } from './util.js';

export const SKINS = [
  { id: 'kniha', n: 'Starobylá kniha', c: '#5b3620', p: '#f2e4c4', paper: 'linky' },
  { id: 'sesit', n: 'Linkovaný sešit', c: '#2f77c9', p: '#fff', paper: 'linky' },
  { id: 'bujo', n: 'Tečkovaný journal', c: '#111', p: '#fbfaf5', paper: 'tecky' },
  { id: 'kraft', n: 'Kraftový zápisník', c: '#7a5a36', p: '#d9c4a0', paper: 'cisty' },
  { id: 'minimal', n: 'Čistý minimal', c: '#cdd8d0', p: '#fff', paper: 'ctverecky' },
  { id: 'noc', n: 'Noční zápisník', c: '#24304d', p: '#1b2336', paper: 'linky', dark: 1 },
];
export const FONTS = [
  { id: 'caveat', n: 'Ruční', f: "'Caveat',cursive", s: 23 },
  { id: 'patrick', n: 'Úhledné', f: "'Patrick Hand',cursive", s: 20 },
  { id: 'shantell', n: 'Fixa', f: "'Shantell Sans',sans-serif", s: 16 },
  { id: 'courier', n: 'Psací stroj', f: "'Courier Prime',monospace", s: 16 },
  { id: 'garamond', n: 'Knižní', f: "'EB Garamond',serif", s: 19 },
  { id: 'inter', n: 'Čisté', f: "'Inter',sans-serif", s: 16 },
];
export const INKS = [
  { id: 'modra', n: 'Modrá', c: ['#1f3f9a', '#9fb8ff'] },
  { id: 'cerna', n: 'Černá', c: ['#1d1d1f', '#f1f1f4'] },
  { id: 'sepie', n: 'Sépie', c: ['#6b4423', '#e7c193'] },
  { id: 'zelena', n: 'Zelená', c: ['#1f6b47', '#8fe0b0'] },
  { id: 'cervena', n: 'Červená', c: ['#a5262c', '#ff9a9a'] },
  { id: 'fialova', n: 'Fialová', c: ['#5b2a86', '#d0adff'] },
];
export const PAPERS = [{ id: 'linky', n: 'Linky' }, { id: 'ctverecky', n: 'Čtverečky' }, { id: 'tecky', n: 'Tečky' }, { id: 'cisty', n: 'Čistý' }];
export const HL = [{ c: 'y', h: '#ffe14d', n: 'žlutá' }, { c: 'p', h: '#ff8fc8', n: 'růžová' }, { c: 'g', h: '#8df07a', n: 'zelená' }, { c: 'b', h: '#79d2ff', n: 'modrá' }, { c: 'o', h: '#ffb347', n: 'oranžová' }];

// Výchozí kategorie (vlastní si uživatel přidá; tyto smazat nejde, jen přebarvit)
export const KATS = [
  ['jidlo', 'Jídlo a nákupy', '#d1495b', 'v'], ['rest', 'Restaurace a kavárny', '#e8a33d', 'v'], ['byd', 'Bydlení a energie', '#00798c', 'v'],
  ['auto', 'Auto a moto', '#30638e', 'v'], ['doprava', 'Doprava', '#5c8dc1', 'v'], ['zdravi', 'Zdraví', '#66a182', 'v'],
  ['obl', 'Oblečení', '#8d6a9f', 'v'], ['zab', 'Zábava a koníčky', '#e07a5f', 'v'], ['deti', 'Děti', '#c9a227', 'v'],
  ['dary', 'Dárky', '#b5838d', 'v'], ['predpl', 'Předplatné', '#6d597a', 'v'], ['ost', 'Ostatní', '#8a8a8a', 'v'],
  ['vypl', 'Výplata', '#2e7d32', 'p'], ['prij', 'Ostatní příjem', '#558b2f', 'p'],
].map((k, i) => ({ id: k[0], n: k[1], c: k[2], t: k[3], ord: i, vych: true }));
export const PEN = { ucet: { id: 'ucet', n: 'Bankovní účet', start: 0 }, hot: { id: 'hot', n: 'Hotovost', start: 0 } };
export const NAST = { skin: 'kniha', font: 'caveat', ink: 'modra', paper: 'linky' };
export const TRIAL_DNI = 30;

const byId = arr => Object.fromEntries(arr.map(x => [x.id, x]));

// Prázdný deník nového uživatele
export function prazdny() {
  const now = Date.now();
  return {
    nast: { ...NAST }, kats: byId(KATS.map(k => ({ ...k }))), pen: JSON.parse(JSON.stringify(PEN)),
    e: {}, notes: {}, stk: {}, pred: {}, vozy: {}, ukoly: {},
    ucet: { vytvoreno: now, trialDo: now + TRIAL_DNI * 864e5 },
  };
}

// Ukázkový měsíc (režim bez účtu a náhled) – data se generují k dnešnímu dni
export function ukazka() {
  const S = prazdny();
  const today = iso(new Date()), ym = mk(today), dd = n => ym + '-' + p2(n), td = new Date().getDate(), first = dd(1);
  const add = (d, typ, kc, text, kat, tagy, extra) => { const o = { id: uid(), d, typ, kc, text, kat, tagy: tagy || [], pen: 'ucet', ...(extra || {}) }; S.e[o.id] = o; return o; };
  const rc = (d, obchod, pol) => { const id = uid(); S.stk[id] = { id, d, obchod, pol }; return id; };
  const tank = (d, l, kc, km, voz, text) => add(d, 'v', kc, text, 'auto', [], { tema: 'tank', pole: { litry: l, tach: km, voz } });
  S.vozy = { octavia: { id: 'octavia', n: 'Škoda Octavia', typ: 'auto' }, cb500: { id: 'cb500', n: 'Honda CB500', typ: 'moto' } };
  S.pen.ucet.start = 18500; S.pen.hot.start = 2400;
  tank(addD(first, -52), 40, 1520, 81920, 'octavia', 'Tankování 40 l, 81 920 km');
  tank(addD(first, -26), 38, 1444, 82560, 'octavia', 'Tankování na Shellu 38 l');
  tank(addD(first, -40), 8.5, 330, 18610, 'cb500', 'Motorka 8,5 l');
  tank(addD(first, -18), 8, 312, 18790, 'cb500', 'Motorka 8 l, výlet Beskydy');
  for (let i = 1; i <= 3; i++) { add(addD(first, -i * 30 + 1), 'p', 32000, 'Výplata', 'vypl', []); add(addD(first, -i * 30 + 4), 'v', 23800 + i * 900, 'Výdaje za měsíc (souhrn)', 'ost', []); }
  const L = [
    [1, () => add(dd(1), 'p', 32000, 'Výplata za minulý měsíc', 'vypl', [])],
    [1, () => add(dd(1), 'v', 12500, 'Nájem', 'byd', ['nájem'])],
    [2, () => { const id = rc(dd(2), 'LIDL Ostrava', [['Rohlíky 10×', 29], ['Mléko polotučné 2×', 49.8], ['Máslo 250 g', 59.9], ['Kuřecí prsa 1 kg', 189.9], ['Jablka 2 kg', 79.8], ['Eidam 30 %', 89.9], ['Káva zrnková 1 kg', 279], ['Pivo 6×', 119.4], ['Prací gel', 199], ['Chléb Šumava', 44.9]]); add(dd(2), 'v', 1141.6, 'Velký nákup v Lidlu', 'jidlo', ['týdenní'], { rc: id }); }],
    [3, () => add(dd(3), 'v', 65, 'káva cestou do práce', 'rest', ['káva'], { pen: 'hot' })],
    [4, () => tank(dd(4), 20, 750, 83087, 'octavia', 'Tankování 20 l za 750 Kč, nájezd 83 087 km')],
    [5, () => add(dd(5), 'v', 1850, 'Záloha na elektřinu', 'byd', [])],
    [6, () => add(dd(6), 'v', 259, 'Netflix', 'predpl', [])],
    [7, () => add(dd(7), 'v', 289, 'oběd s kolegy', 'rest', [])],
    [8, () => add(dd(8), 'v', 986, 'Kaufland', 'jidlo', ['týdenní'])],
    [9, () => add(dd(9), 'v', 380, 'kino ve dvou', 'zab', ['rande'])],
    [10, () => add(dd(10), 'v', 65, 'káva', 'rest', ['káva'], { pen: 'hot' })],
    [11, () => tank(dd(11), 9.2, 345, 18940, 'cb500', 'Motorka 9,2 l za 345 Kč, 18 940 km')],
    [12, () => add(dd(12), 'v', 214, 'lékárna – vitamíny', 'zdravi', [])],
    [13, () => add(dd(13), 'v', 642, 'Albert', 'jidlo', [])],
    [14, () => add(dd(14), 'v', 1790, 'zimní boty', 'obl', [])],
    [15, () => add(dd(15), 'v', 59, 'káva s Janou', 'rest', ['káva'], { pen: 'hot' })],
    [16, () => tank(dd(16), 38, 1406, 83702, 'octavia', 'Tankování 38 l za 1 406 Kč, 83 702 km')],
    [17, () => add(dd(17), 'v', 600, 'dárek pro mamku', 'dary', ['narozeniny'])],
    [18, () => add(dd(18), 'v', 1102, 'Lidl', 'jidlo', ['týdenní'])],
    [19, () => add(dd(19), 'v', 329, 'pizza', 'rest', ['rande'])],
    [20, () => add(dd(20), 'v', 169, 'Spotify', 'predpl', [])],
    [21, () => { const id = rc(dd(21), 'PENNY Market', [['Banány', 32.9], ['Jogurt bílý 4×', 63.6], ['Chléb', 44.9], ['Šunka výběrová', 89.9], ['Těstoviny 2×', 59.8], ['Rajčata', 54.9]]); add(dd(21), 'v', 346, 'Penny', 'jidlo', [], { rc: id }); }],
    [21, () => add(dd(21), 'v', 65, 'káva', 'rest', ['káva'], { pen: 'hot' })],
  ];
  L.forEach(x => { if (x[0] <= td) x[1](); });
  S.notes[today] = 'Dneska jsem {{y|konečně}} dotankoval a vyšlo to levněji než minule.\nZítra {{p|nezapomenout}} zaplatit pojištění auta.';
  S.pred[ym] = { zapsano: first, prijem: 32000, vydaje: 27500 };
  const prevYm = mk(addD(first, -1));
  [['Zaplatit pojištění auta', dd(Math.min(25, 28)), false, ym], ['Objednat STK na motorku', '', false, prevYm], ['Vrátit Petrovi 500 Kč', '', true, ym], ['Zrušit nepoužívané předplatné', '', false, ym]]
    .forEach(([text, termin, hotovo, mesic]) => { const id = uid(); S.ukoly[id] = { id, text, termin, hotovo, mesic }; });
  return S;
}
