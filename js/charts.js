// Finanční deník · charts.js · v0.1.0
// Grafy „kreslené perem“: každá čára se kreslí dvakrát s drobným chvěním (vlastní obdoba rough.js).

import { pd, mk, dim, dnes, kc, nf } from './util.js';
import { monthE, tankStats } from './logic.js';

function rnd(seed) { let s = (seed >>> 0) % 2147483647 || 7; return () => (s = s * 16807 % 2147483647) / 2147483647; }
const wob = (pts, seed, a) => { const r = rnd(seed); return pts.map((p, i) => (i ? 'L' : 'M') + (p[0] + (r() - 0.5) * a).toFixed(1) + ' ' + (p[1] + (r() - 0.5) * a).toFixed(1)).join(''); };
const seg = (x1, y1, x2, y2, n) => { const o = []; for (let i = 0; i <= n; i++) o.push([x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n]); return o; };
const pen = (pts, seed, col, w, dash) => {
  const da = dash ? ' stroke-dasharray="7 6"' : '';
  return '<path d="' + wob(pts, seed, 1.4) + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"' + da + '/>' +
    '<path d="' + wob(pts, seed + 99, 2.2) + '" fill="none" stroke="' + col + '" stroke-width="' + (w * 0.5) + '" opacity=".45" stroke-linecap="round"' + da + '/>';
};
const nice = m => { const p = 10 ** Math.floor(Math.log10(m || 1)); return [1, 2, 2.5, 5, 10].map(k => k * p).find(k => m / k <= 4); };
const barvy = () => { const cs = getComputedStyle(document.body); return { ink: cs.getPropertyValue('--ink').trim(), ui: cs.getPropertyValue('--ui').trim(), acc: cs.getPropertyValue('--acc').trim() }; };

// Měsíc: kumulované výdaje den po dni proti čárkovanému plánu
export function grafMesic(svg, S, ym) {
  const { ink, ui, acc } = barvy(), W = svg.clientWidth, H = svg.clientHeight, N = dim(ym), pr = S.pred[ym], now = dnes();
  const last = mk(now) === ym ? pd(now).getDate() : (ym < mk(now) ? N : 0);
  const daily = Array(N).fill(0);
  monthE(S, ym).filter(e => e.typ === 'v').forEach(e => { daily[pd(e.d).getDate() - 1] += e.kc; });
  let c = 0; const cum = daily.map(v => (c += v)).slice(0, last);
  const mx = Math.max(pr ? pr.vydaje : 0, c, 1) * 1.08, l = W < 440 ? 44 : 58, r = W < 440 ? 14 : 52, t = 16, bt = 30, step = nice(mx);
  const X = d => l + (d - 1) / (N - 1) * (W - l - r), Y = v => H - bt - v / mx * (H - t - bt);
  let s = pen(seg(l, H - bt, W - r, H - bt, 8), 3, ui, 1.3) + pen(seg(l, t, l, H - bt, 6), 5, ui, 1.3);
  for (let v = step; v < mx; v += step) s += '<text x="' + (l - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + (v >= 1000 ? (v / 1000).toLocaleString('cs-CZ') + ' tis.' : v) + '</text>';
  [1, 10, 20, N].forEach(d => { s += '<text x="' + X(d) + '" y="' + (H - 8) + '" text-anchor="middle">' + d + '.</text>'; });
  if (pr) {
    s += pen(seg(X(1), Y(pr.vydaje / N), X(N), Y(pr.vydaje), 10), 11, acc, 2, 1);
    if (W >= 440) s += '<text x="' + (X(N) + 6) + '" y="' + (Y(pr.vydaje) + 4) + '" style="fill:' + acc + '">plán</text>';
  }
  if (cum.length) {
    s += pen(cum.map((v, i) => [X(i + 1), Y(v)]), 17, ink, 2.6);
    const lx = X(cum.length), ly = Y(cum[cum.length - 1]);
    s += '<circle cx="' + lx + '" cy="' + ly + '" r="4.5" fill="' + ink + '"/>';
    if (W >= 440) s += '<text x="' + (lx - 8) + '" y="' + (ly - 10) + '" text-anchor="end">' + kc(cum[cum.length - 1]) + '</text>';
  }
  svg.innerHTML = s;
}

// Tankování: spotřeba každého úseku + čárkovaný průměr
export function grafTank(svg, list) {
  const { ink, ui, acc } = barvy(), W = svg.clientWidth, H = svg.clientHeight, st = tankStats(list), sg = st.seg;
  if (!sg.length) { svg.innerHTML = ''; return; }
  const mx = Math.max(...sg.map(x => x.sp), st.avg) * 1.25, l = 40, r = W < 440 ? 14 : 66, t = 22, bt = 30, n = sg.length;
  const X = i => n === 1 ? (l + W - r) / 2 : l + 24 + i / (n - 1) * (W - l - r - 48), Y = y => H - bt - y / mx * (H - t - bt);
  let s = pen(seg(l, H - bt, W - r, H - bt, 8), 21, ui, 1.3) + pen(seg(l, t, l, H - bt, 6), 23, ui, 1.3);
  const step = nice(mx);
  for (let y = step; y < mx; y += step) s += '<text x="' + (l - 8) + '" y="' + (Y(y) + 4) + '" text-anchor="end">' + y + '</text>';
  s += pen(seg(l, Y(st.avg), W - r, Y(st.avg), 8), 29, acc, 1.8, 1);
  if (W >= 440) s += '<text x="' + (W - r + 6) + '" y="' + (Y(st.avg) + 4) + '" style="fill:' + acc + '">průměr</text>';
  if (n > 1) s += pen(sg.map((x, i) => [X(i), Y(x.sp)]), 31, ink, 2.2);
  const kazdy = Math.ceil(n / Math.max(1, Math.floor((W - l - r) / 64)));
  sg.forEach((x, i) => {
    const d = pd(x.e.d);
    s += '<circle cx="' + X(i) + '" cy="' + Y(x.sp) + '" r="4.5" fill="' + ink + '"/><text x="' + X(i) + '" y="' + (Y(x.sp) - 10) + '" text-anchor="middle">' + nf(x.sp, 1) + '</text>';
    if (i % kazdy === 0 || i === n - 1) s += '<text x="' + X(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + d.getDate() + '. ' + (d.getMonth() + 1) + '.</text>';
  });
  svg.innerHTML = s;
}
