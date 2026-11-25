// Finanční deník · store.js · v0.6.0
// Jediné místo, kde se mění data. Dva režimy:
//   local – bez účtu, vše v localStorage (ukázka / vyzkoušení)
//   cloud – Firebase RTDB users/{uid}/…, každá změna se zapisuje po položkách
//           (e/{id}, notes/{den}…), ne celý deník najednou. Kopie v localStorage = rychlý start a offline.

import { prazdny, ukazka, STARE_SKINY } from './data.js';

export const st = { S: null, mode: 'local', uid: null, cloud: null, onChange: () => {} };
const LOCAL = 'fd-local-1';
const cacheKey = () => st.mode === 'cloud' ? 'fd-cache-' + st.uid : LOCAL;
const clean = v => v === undefined ? null : JSON.parse(JSON.stringify(v));

function ulozKopii() { try { localStorage.setItem(cacheKey(), JSON.stringify(st.S)); } catch (err) { /* plné úložiště – data jsou v cloudu */ } }

// Doplní chybějící sekce (RTDB nevrací prázdné objekty ani pole)
export function doplnit(S) {
  const d = prazdny();
  const o = Object.assign({}, S || {});
  for (const k of Object.keys(d)) if (o[k] == null) o[k] = k === 'ucet' ? null : d[k];
  const st0 = o.nast || {};
  o.nast = Object.assign({}, d.nast, st0.skin && !st0.desky ? STARE_SKINY[st0.skin] || {} : {}, st0);
  if (st0.paper && !st0.linky) o.nast.linky = st0.paper;
  Object.values(o.e || {}).forEach(e => { e.tagy = e.tagy || []; });
  return o;
}

export function startLocal(demo) {
  st.mode = 'local'; st.uid = null; st.token = null;
  let S = null;
  try { S = JSON.parse(localStorage.getItem(LOCAL)); } catch (err) { S = null; }
  st.S = doplnit(S || (demo ? ukazka() : prazdny()));
  ulozKopii();
}

export function resetLocal(demo) { st.S = doplnit(demo ? ukazka() : prazdny()); ulozKopii(); }

// cloud: { write(path, val) } z cloud.js
export function startCloud(uid, cloud) {
  st.mode = 'cloud'; st.uid = uid; st.cloud = cloud;
  let S = null;
  try { S = JSON.parse(localStorage.getItem(cacheKey())); } catch (err) { S = null; }
  st.S = S ? doplnit(S) : null;
}

// Data z cloudu (první načtení i změny z jiného zařízení)
export function zCloudu(data) {
  if (!data || !data.ucet) {
    // První přihlášení: založit deník po sekcích (pravidla nedovolí zapsat celý users/{uid})
    const p = prazdny();
    if (data) Object.assign(p, data, { ucet: p.ucet });
    // ucet první: další snímky z onValue už ho obsahují, takže se zakládání nespustí znovu
    for (const k of ['ucet', ...Object.keys(p).filter(k => k !== 'ucet')]) st.cloud.write([k], clean(p[k]));
    st.S = doplnit(p);
  } else st.S = doplnit(data);
  ulozKopii();
  st.onChange();
}

// Zápis jedné položky: zapis(['e', id], objekt) · smazání: zapis(['e', id], null)
export function zapis(path, val) {
  let o = st.S;
  for (let i = 0; i < path.length - 1; i++) { if (o[path[i]] == null) o[path[i]] = {}; o = o[path[i]]; }
  const last = path[path.length - 1];
  if (val === null || val === undefined) delete o[last]; else o[last] = val;
  ulozKopii();
  if (st.mode === 'cloud' && st.cloud) st.cloud.write(path, clean(val));
}
