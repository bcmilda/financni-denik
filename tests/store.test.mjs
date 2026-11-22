// Finanční deník · test úložiště s falešným cloudem · node tests/store.test.mjs
import assert from 'node:assert/strict';
import { st, startCloud, zCloudu, zapis } from '../app/js/store.js';

const zapisy = [];
const fake = { write: (path, val) => zapisy.push([path.join('/'), val]) };
let zmen = 0; st.onChange = () => zmen++;

startCloud('u1', fake);
assert.equal(st.S, null);
zCloudu(null);                                   // první přihlášení
assert.equal(zapisy[0][0], 'ucet', 'ucet se zakládá jako první');
assert.ok(zapisy.some(z => z[0] === 'kats' && Object.keys(z[1]).length >= 12));
assert.ok(st.S.ucet.trialDo > Date.now());
assert.equal(zmen, 1);

zapisy.length = 0;
zapis(['e', 'x1'], { id: 'x1', d: '2026-11-21', typ: 'v', kc: 65, text: 'káva', tagy: [], neco: undefined });
assert.deepEqual(zapisy[0], ['e/x1', { id: 'x1', d: '2026-11-21', typ: 'v', kc: 65, text: 'káva', tagy: [] }], 'zapisuje se jen jedna položka, bez undefined');
zapis(['kats', 'jidlo', 'c'], '#000000');
assert.equal(zapisy[1][0], 'kats/jidlo/c');
zapis(['e', 'x1'], null);
assert.deepEqual(zapisy[2], ['e/x1', null]); assert.equal(st.S.e.x1, undefined);

zCloudu({ ucet: { vytvoreno: 1, trialDo: 2 }, nast: { skin: 'noc' } });   // data z jiného zařízení (RTDB vynechá prázdné sekce)
assert.equal(st.S.nast.skin, 'noc'); assert.equal(st.S.nast.font, 'caveat'); assert.deepEqual(st.S.e, {});
console.log('store: 11 kontrol prošlo');
