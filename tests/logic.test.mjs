// Finanční deník · testy čisté logiky · spuštění: node tests/logic.test.mjs
import assert from 'node:assert/strict';
import { parse, tankStats, tachOk, hledej, zustatek, deser, plain, mesice, souhrnMesice, stavKDatu, oceneni, posunYm, katObdobi, trackerStat, pravidelneMesic, pocitStat, rokVPuntikach, limitDne, pondeli, tydenStat, cisloTydne, dluhStav, dluhyPoLidech, obalkyMesic, dalsiNarozeniny, narozeninySeznam, sumT, monthE } from '../app/js/logic.js';
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
t('měsíce, souhrn a pokladní stav', () => {
  const S = prazdny();
  S.pen.ucet.start = 1000;
  const E = (id, d, typ, kc, kat) => { S.e[id] = { id, d, typ, kc, kat, pen: 'ucet', tagy: [] }; };
  E('a', '2026-10-01', 'p', 30000, 'vypl'); E('b', '2026-10-02', 'v', 10000, 'byd'); E('c', '2026-11-01', 'p', 30000, 'vypl'); E('d', '2026-11-03', 'v', 8000, 'byd'); E('e', '2026-11-04', 'v', 1000, 'jidlo');
  assert.equal(posunYm('2026-01', -1), '2025-12'); assert.equal(posunYm('2026-11', 2), '2027-01');
  const m = mesice(S, '2026-11', 3);
  assert.deepEqual(m.map(x => x.exp), [0, 10000, 9000]);
  const s = souhrnMesice(S, '2026-11');
  assert.equal(s.zExp, -10); assert.equal(s.zust, 21000); assert.deepEqual(s.kats[0], ['byd', 8000]);
  assert.equal(stavKDatu(S, '2026-11-01'), 21000); assert.equal(stavKDatu(S, '2026-11-05'), 42000);
  assert.deepEqual(katObdobi(S, '2026-10', '2026-11').map(x => x[0]), ['byd', 'jidlo']);
});
t('ocenění z dat', () => {
  const S = prazdny();
  ['01', '02', '03', '04', '05', '06', '07'].forEach((d, i) => { S.e['x' + i] = { id: 'x' + i, d: '2026-10-' + d, typ: i ? 'v' : 'p', kc: i ? 100 : 5000, kat: 'ost', tagy: [] }; });
  S.pred['2026-10'] = { prijem: 5000, vydaje: 1000 };
  S.cile = { a: { id: 'a', cil: 1000, nasporeno: 600 } };
  const o = Object.fromEntries(oceneni(S, '2026-11-20').map(x => [x.id, x.kdy]));
  assert.equal(o.prvni, '2026-10-01'); assert.equal(o.tyden, '2026-10-07'); assert.ok(o.plus); assert.ok(o.plan);
  assert.ok(o.pulcil); assert.equal(o.cil, null); assert.equal(o.rok, null);
});
t('tracker: série, nejdelší série, měsíce', () => {
  const tr = { dny: { '2026-11-20': 1, '2026-11-21': 1, '2026-11-23': 2, '2026-11-24': 1, '2026-11-25': 1, '2026-10-02': 1 } };
  const s = trackerStat(tr, '2026-11-25');
  assert.equal(s.serie, 3); assert.equal(s.nejdelsi, 3); assert.equal(s.mesice['2026-11'], 6); assert.equal(s.predDny, 0);
  assert.equal(trackerStat(tr, '2026-11-26').serie, 3, 'včerejší série platí');
  assert.equal(trackerStat(tr, '2026-11-28').serie, 0);
  assert.equal(trackerStat({}, '2026-11-25').posledni, null);
});
t('pravidelné platby a emoce', () => {
  const S = prazdny();
  S.pravidelne = { n: { id: 'n', nazev: 'Nájem', kc: 12000, den: 1 }, s: { id: 's', nazev: 'Spotify', kc: 169, den: 20 }, z: { id: 'z', nazev: 'Zrušeno', kc: 1, den: 2, aktivni: false } };
  S.e = { a: { id: 'a', d: '2026-11-01', typ: 'v', kc: 12000, prav: 'n', kat: 'byd', tagy: [] }, b: { id: 'b', d: '2026-11-03', typ: 'v', kc: 300, pocit: 'radost', kat: 'zab', tagy: [] }, c: { id: 'c', d: '2026-11-04', typ: 'v', kc: 100, pocit: 'impulz', kat: 'rest', tagy: [] } };
  const l = pravidelneMesic(S, '2026-11');
  assert.deepEqual(l.map(x => [x.p.id, !!x.zapl]), [['n', true], ['s', false]]);
  const p = pocitStat(S, '2026-11');
  assert.equal(p.pct('radost'), 75); assert.equal(p.pocet, 2);
});
t('rok v puntících a denní limit', () => {
  const S = prazdny();
  S.pred['2026-11'] = { prijem: 30000, vydaje: 15000 };
  S.pravidelne = { n: { id: 'n', nazev: 'Nájem', kc: 12000, den: 1 } };
  S.e = { a: { id: 'a', d: '2026-11-01', typ: 'v', kc: 12000, prav: 'n', kat: 'byd', tagy: [] }, b: { id: 'b', d: '2026-11-02', typ: 'v', kc: 50, kat: 'jidlo', tagy: [] }, c: { id: 'c', d: '2026-11-03', typ: 'v', kc: 500, kat: 'jidlo', tagy: [] }, d: { id: 'd', d: '2026-11-01', typ: 'p', kc: 30000, kat: 'vypl', tagy: [] } };
  assert.equal(limitDne(S, '2026-11'), 100);
  const r = rokVPuntikach(S, 2026, '2026-11-03'), nov = r[10];
  assert.deepEqual(nov.dny.slice(0, 4).map(d => d.st), ['ok', 'ok', 'nad', 'nic'], 'nájem se nepočítá, budoucnost je prázdná');
  assert.equal(r[0].dny[0].st, 'nic');
  assert.equal(rokVPuntikach(S, 2026, '2026-12-15')[10].pecet, true);
});
t('týdenní list: pondělí, číslo týdne, souhrn', () => {
  assert.equal(pondeli('2026-11-25'), '2026-11-23'); assert.equal(pondeli('2026-11-29'), '2026-11-23'); assert.equal(pondeli('2026-11-23'), '2026-11-23');
  assert.equal(pondeli('2027-01-01'), '2026-12-28', 'přes rok');
  assert.equal(cisloTydne('2026-11-23'), 48); assert.equal(cisloTydne('2026-12-28'), 53); assert.equal(cisloTydne('2027-01-04'), 1);
  const S = prazdny();
  S.pred['2026-11'] = { prijem: 30000, vydaje: 3000 };
  S.e = { a: { id: 'a', d: '2026-11-23', typ: 'v', kc: 50, kat: 'jidlo', pocit: 'radost', tagy: [] }, b: { id: 'b', d: '2026-11-24', typ: 'v', kc: 400, kat: 'zab', tagy: [] },
    c: { id: 'c', d: '2026-11-17', typ: 'v', kc: 900, kat: 'jidlo', tagy: [] }, d: { id: 'd', d: '2026-11-25', typ: 'p', kc: 1000, kat: 'prij', tagy: [] } };
  S.notes['2026-11-26'] = 'pohoda';
  const w = tydenStat(S, '2026-11-23', '2026-11-25');
  assert.equal(w.vyd, 450); assert.equal(w.prij, 1000); assert.equal(w.minule, 900); assert.equal(w.maMinule, true);
  assert.deepEqual(w.dny.map(x => x.st), ['ok', 'nad', 'ok', 'nic', 'nic', 'nic', 'nic'], 'limit 100 Kč/den, budoucnost prázdná');
  assert.equal(w.vLimitu, 2); assert.equal(w.ubehlo, 3); assert.equal(w.nejvetsi.id, 'b'); assert.equal(w.pocit.radost, 50); assert.equal(w.zapsanoDni, 4);
  assert.equal(w.ne, '2026-11-29');
});
t('ukázka má nálepky a uzavřený týden', () => {
  const S = ukazka();
  assert.ok(Object.values(S.nalepky).some(n => n.druh === 'postit' && n.text));
  assert.ok(Object.values(S.tydny).some(x => x.hotovo && x.priste));
});
t('převody mění zůstatky peněženek, ne výdaje', () => {
  const S = prazdny();
  S.pen.ucet.start = 10000; S.pen.hot.start = 100;
  S.e = { a: { id: 'a', d: '2026-11-02', typ: 'v', kc: 300, kat: 'jidlo', pen: 'hot', tagy: [] } };
  S.prevody = { p: { id: 'p', d: '2026-11-01', kc: 2000, z: 'ucet', na: 'hot' } };
  assert.equal(zustatek(S, 'ucet'), 8000); assert.equal(zustatek(S, 'hot'), 1800);
  assert.equal(sumT(monthE(S, '2026-11'), 'v'), 300, 'převod není výdaj');
});
t('dlužníček: splátky, vráceno, vzájemné započtení', () => {
  assert.deepEqual(dluhStav({ kc: 1000 }), { splaceno: 0, zbyva: 1000, hotovo: false });
  assert.deepEqual(dluhStav({ kc: 1000, splatky: { a: { kc: 400 }, b: { kc: 250.5 } } }), { splaceno: 650.5, zbyva: 349.5, hotovo: false });
  assert.equal(dluhStav({ kc: 1000, splatky: { a: { kc: 1200 } } }).hotovo, true, 'přeplaceno = vyrovnáno');
  assert.equal(dluhStav({ kc: 1000, vraceno: 1 }).zbyva, 0);
  const S = prazdny();
  S.dluhy = { a: { id: 'a', kdo: 'Petr', kc: 500, smer: 'mne', d: '2026-11-01' }, b: { id: 'b', kdo: 'petr ', kc: 200, smer: 'ja', d: '2026-11-02' }, c: { id: 'c', kdo: 'Jana', kc: 300, smer: 'mne', d: '2026-11-03', vraceno: 1 } };
  const l = dluhyPoLidech(S);
  assert.equal(l.length, 1, 'Jana vyrovnaná, Petr sloučený bez ohledu na velikost písmen');
  assert.equal(l[0].mne, 500); assert.equal(l[0].ja, 200); assert.equal(l[0].cisty, 300);
});
t('obálky sčítají své kategorie, nic dvakrát', () => {
  const S = prazdny();
  S.e = { a: { id: 'a', d: '2026-11-02', typ: 'v', kc: 300, kat: 'jidlo', tagy: [] }, b: { id: 'b', d: '2026-11-03', typ: 'v', kc: 700, kat: 'auto', tagy: [] },
    c: { id: 'c', d: '2026-11-04', typ: 'v', kc: 100, kat: 'doprava', tagy: [] }, d: { id: 'd', d: '2026-11-05', typ: 'v', kc: 50, kat: 'zab', tagy: [] }, e: { id: 'e', d: '2026-10-30', typ: 'v', kc: 999, kat: 'jidlo', tagy: [] } };
  S.obalky = { j: { id: 'j', nazev: 'Jídlo', kc: 1000, kats: { jidlo: true }, ord: 0 }, a: { id: 'a', nazev: 'Auto', kc: 600, kats: { auto: true, doprava: true }, ord: 1 } };
  const m = obalkyMesic(S, '2026-11');
  assert.deepEqual(m.radky.map(r => [r.o.id, r.utraceno, r.zbyva]), [['j', 300, 700], ['a', 800, -200]]);
  assert.equal(m.rozdeleno, 1600); assert.equal(m.mimo, 50);
});
t('narozeniny: nejbližší datum, věk, neznámý rok, 29. února', () => {
  assert.deepEqual(dalsiNarozeniny('2019-12-03', '2026-11-27'), { d: '2026-12-03', za: 6, vek: 7 });
  assert.deepEqual(dalsiNarozeniny('1966-03-14', '2026-11-27'), { d: '2027-03-14', za: 107, vek: 61 });
  assert.deepEqual(dalsiNarozeniny('--11-27', '2026-11-27'), { d: '2026-11-27', za: 0, vek: null });
  assert.equal(dalsiNarozeniny('2000-02-29', '2027-01-10').d, '2027-02-28');
  assert.equal(dalsiNarozeniny('blbost', '2026-11-27'), null);
  const S = prazdny();
  S.osoby = { ema: { id: 'ema', jmeno: 'Ema', narozeni: '2019-12-03' } };
  S.narozeniny = { x: { id: 'x', jmeno: 'Babička', datum: '1952-12-01' }, 'o-ema': { id: 'o-ema', osoba: 'ema', napady: 'lego' } };
  const l = narozeninySeznam(S, '2026-11-27');
  assert.deepEqual(l.map(x => [x.jmeno, x.za]), [['Babička', 4], ['Ema', 6]]);
  assert.equal(l[1].z.napady, 'lego', 'dárky osoby z Knihy života se drží v narozeniny/o-id');
});
console.log(`\n${ok} testů prošlo`);
