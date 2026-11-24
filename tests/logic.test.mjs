// Finanční deník · testy čisté logiky · spuštění: node tests/logic.test.mjs
import assert from 'node:assert/strict';
import { parse, tankStats, tachOk, hledej, zustatek, deser, plain } from '../app/js/logic.js';
import { prazdny, ukazka } from '../app/js/data.js';
import { vek, nazevZubu, oblouk, stavZubu } from '../app/js/zivot-data.js';

let ok = 0;
const t = (nazev, fn) => { fn(); ok++; console.log('✓', nazev); };

t('tankování z věty bez diakritiky (Milanův příklad)', () => {
  const p = parse('Tankovani 20l za 750kc, najezd 83087km');
  assert.equal(p.amt, 750); assert.equal(p.litry, 20); assert.equal(p.km, 83087); assert.equal(p.tank, true); assert.equal(p.kat, 'auto');
});
t('tankování s mezerami v tisících a tagem', () => {
  const p = parse('Tankování 38 l za 1 406 Kč, 83 702 km #dovolená');
  assert.equal(p.amt, 1406); assert.equal(p.km, 83702); assert.deepEqual(p.tagy, ['dovolená']);
});
t('motorka s desetinnými litry', () => {
  const p = parse('Tankování motorka 9,2 l za 345 Kč, 18 940 km');
  assert.equal(p.litry, 9.2); assert.equal(p.amt, 345); assert.equal(p.km, 18940);
});
t('částka na konci se odřízne z textu', () => {
  const p = parse('káva 65 #práce #ráno');
  assert.equal(p.amt, 65); assert.equal(p.text, 'káva'); assert.deepEqual(p.tagy, ['práce', 'ráno']); assert.equal(p.kat, 'rest');
});
t('velká částka s mezerou', () => { assert.equal(parse('výplata 32 000').amt, 32000); assert.equal(parse('výplata 32 000').kat, 'vypl'); });
t('haléře s čárkou a Kč uprostřed', () => { assert.equal(parse('Lidl nákup 1 248,50 Kč').amt, 1248.5); });
t('bez částky', () => { assert.ok(isNaN(parse('jen poznámka').amt)); });

const T = (d, l, kc, tach) => ({ d, kc, tema: 'tank', pole: { litry: l, tach, voz: 'a' } });
const zaznamy = [T('2026-09-10', 40, 1520, 81920), T('2026-10-06', 38, 1444, 82560), T('2026-11-04', 20, 750, 83087), T('2026-11-16', 38, 1406, 83702)];
t('klouzavá spotřeba a Kč/km', () => {
  const s = tankStats(zaznamy);
  assert.equal(s.km, 1782); assert.equal(s.avg.toFixed(2), '5.39'); assert.equal(s.kckm.toFixed(2), '2.02'); assert.equal(s.seg.length, 3);
});
t('tankování bez tachometru se do spotřeby nepočítá', () => {
  const s = tankStats([...zaznamy, T('2026-11-18', 10, 380, 0)]);
  assert.equal(s.z.length, 4);
});
t('kontrola tachometru', () => {
  assert.equal(tachOk(zaznamy, '2026-11-20', 84000), true);
  assert.equal(tachOk(zaznamy, '2026-11-20', 83000), false);
  assert.equal(tachOk(zaznamy, '2026-10-20', 83500), false);
});

t('prázdný deník má zkušební měsíc', () => {
  const S = prazdny();
  const dni = Math.round((S.ucet.trialDo - S.ucet.vytvoreno) / 864e5);
  assert.equal(dni, 30); assert.ok(Object.keys(S.kats).length >= 12);
});
t('zůstatek peněženky', () => {
  const S = prazdny();
  S.pen.hot.start = 1000;
  S.e = { a: { id: 'a', d: '2026-11-01', typ: 'v', kc: 65, pen: 'hot' }, b: { id: 'b', d: '2026-11-02', typ: 'p', kc: 500, pen: 'hot' }, c: { id: 'c', d: '2026-11-02', typ: 'v', kc: 999, pen: 'ucet' } };
  assert.equal(zustatek(S, 'hot'), 1435);
});
t('hledání bez diakritiky najde zápis, zápisek i tag', () => {
  const S = ukazka();
  const r = hledej(S, 'kava');
  assert.ok(r.some(x => x.typ === 'e'));
  assert.ok(hledej(S, '#rande').every(x => x.typ !== 'e' || x.e.tagy.includes('rande')));
  assert.deepEqual(hledej(S, 'k'), []);
});
t('zvýraznění v zápisku se escapuje a zachová', () => {
  assert.equal(deser('a <b> {{y|ahoj}}\nb'), 'a &lt;b&gt; <mark class="hl" data-c="y">ahoj</mark><br>b');
  assert.equal(plain('x {{p|y}} z'), 'x y z');
});
t('věk česky', () => {
  assert.equal(vek('2019-05-12', '2025-09-03'), '6 let');
  assert.equal(vek('2019-05-12', '2024-09-09'), '5 let 3 měsíce');
  assert.equal(vek('2019-05-12', '2020-05-11'), '11 měsíců');
  assert.equal(vek('2019-05-12', '2019-06-01'), '2 týdny');
  assert.equal(vek('2019-05-12', '2021-06-12'), '2 roky 1 měsíc');
  assert.equal(vek('1985-01-01', '2026-11-24'), '41 let');
  assert.equal(vek('', '2026-01-01'), '');
});
t('zuby FDI', () => {
  assert.equal(nazevZubu(81), 'řezák střední vpravo dole (mléčný)');
  assert.equal(nazevZubu(36), 'první stolička vlevo dole');
  assert.deepEqual(oblouk(true, true), [55, 54, 53, 52, 51, 61, 62, 63, 64, 65]);
  assert.equal(oblouk(false, false).length, 16);
  const st = stavZubu([{ typ: 'zub', zub: 71, akce: 'vypadl', d: '2025-10-20' }, { typ: 'zub', zub: 81, akce: 'vypadl', d: '2025-09-03' }, { typ: 'zub', zub: 36, akce: 'prorezal', d: '2025-06-10' }]);
  assert.equal(st[81].prvni, true); assert.equal(st[71].prvni, undefined); assert.equal(st[36].prorezal, '2025-06-10');
});
t('kniha života v ukázce a v hledání', () => {
  const S = ukazka();
  assert.ok(Object.keys(S.osoby).length === 2 && Object.keys(S.zivot).length > 20);
  assert.ok(hledej(S, 'mandle').some(x => x.typ === 'z' && x.z.typ === 'lekar'));
  assert.ok(hledej(S, 'MMR').filter(x => x.typ === 'z').length === 2);
});
console.log(`\n${ok} testů prošlo`);
