// Finanční deník · charts.js · v0.4.0
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

// Jednoduchá řada v čase (růst: výška nebo váha) – body [{ d, v }]
export function grafRada(svg, body, jednotka, des) {
  const { ink, ui } = barvy(), W = svg.clientWidth, H = svg.clientHeight;
  if (body.length < 1) { svg.innerHTML = '<text x="' + (W / 2) + '" y="' + (H / 2) + '" text-anchor="middle">Zatím žádné měření</text>'; return; }
  const t = s => pd(s).getTime(), t0 = t(body[0].d), t1 = Math.max(t(body[body.length - 1].d), t0 + 864e5);
  const vs = body.map(b => b.v), lo = Math.min(...vs), hi = Math.max(...vs), pad = Math.max(1, (hi - lo) * 0.15);
  const a = Math.max(0, lo - pad), b = hi + pad, l = 44, r = 18, tp = 18, bt = 28;
  const X = s => body.length === 1 ? (l + W - r) / 2 : l + 10 + (t(s) - t0) / (t1 - t0) * (W - l - r - 20), Y = v => H - bt - (v - a) / (b - a) * (H - tp - bt);
  let s = pen(seg(l, H - bt, W - r, H - bt, 8), 41, ui, 1.3) + pen(seg(l, tp, l, H - bt, 6), 43, ui, 1.3);
  const step = nice((b - a) / 1.2);
  for (let y = Math.ceil(a / step) * step; y < b; y += step) s += '<text x="' + (l - 8) + '" y="' + (Y(y) + 4) + '" text-anchor="end">' + nf(y, 0) + '</text>';
  if (body.length > 1) s += pen(body.map(p => [X(p.d), Y(p.v)]), 47, ink, 2.4);
  const kazdy = Math.ceil(body.length / Math.max(1, Math.floor((W - l - r) / 70)));
  body.forEach((p, i) => {
    s += '<circle cx="' + X(p.d) + '" cy="' + Y(p.v) + '" r="4" fill="' + ink + '"/>';
    if (i === body.length - 1) s += '<text x="' + (X(p.d) - 8) + '" y="' + (Y(p.v) - 10) + '" text-anchor="end">' + nf(p.v, des) + ' ' + jednotka + '</text>';
    if (i % kazdy === 0 || i === body.length - 1) s += '<text x="' + X(p.d) + '" y="' + (H - 8) + '" text-anchor="middle">' + p.d.slice(0, 4) + '</text>';
  });
  svg.innerHTML = s;
}

// ---------- v0.4: akvarelové grafy (sloupce, koláč, budík plánu) ----------
export const MES_KR = ['Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čvn', 'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro'];
// Akvarel: tvar se zvlní šumem (feTurbulence) a dostane tmavší okraj jako zaschlá barva
const akvDefs = id => '<defs><filter id="' + id + '" x="-8%" y="-8%" width="116%" height="116%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="5" result="n"/>' +
  '<feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G"/></filter></defs>';
const akv = (d, c, fid, extra) => '<path d="' + d + '" fill="' + c + '" fill-opacity=".62" filter="url(#' + fid + ')"' + (extra || '') + '/>' +
  '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-opacity=".85" stroke-width="1.6" filter="url(#' + fid + ')"' + (extra || '') + '/>';
const tis = v => v >= 1000 ? (v / 1000).toLocaleString('cs-CZ', { maximumFractionDigits: 1 }) + 'k' : String(Math.round(v));

export function grafSloupce(svg, data, barvy) {
  const { ui } = barvyStranky(), W = svg.clientWidth, H = svg.clientHeight, fid = svg.id + '-akv';
  const cInc = (barvy && barvy.inc) || '#4c9a5a', cExp = (barvy && barvy.exp) || '#ef8a3c';
  const mx = Math.max(1, ...data.map(d => Math.max(d.inc, d.exp))) * 1.15, l = 42, r = 12, t = 30, bt = 26, step = nice(mx / 1.1);
  const Y = v => H - bt - v / mx * (H - t - bt), sl = (W - l - r) / data.length, bw = Math.min(26, sl * 0.3);
  let s = akvDefs(fid) + pen(seg(l, H - bt, W - r, H - bt, 10), 51, ui, 1.3);
  for (let v = step; v < mx; v += step) s += '<line x1="' + l + '" x2="' + (W - r) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="' + ui + '" stroke-opacity=".12" stroke-dasharray="3 5"/><text x="' + (l - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + tis(v) + '</text>';
  data.forEach((d, i) => {
    const cx = l + sl * i + sl / 2, m = +d.ym.slice(5, 7) - 1;
    [[d.inc, cInc, -1], [d.exp, cExp, 1]].forEach(([v, c, k]) => {
      if (v <= 0) return;
      const x0 = cx + (k < 0 ? -bw - 2 : 2), y0 = Y(v), y1 = H - bt;
      s += akv('M' + x0 + ' ' + y1 + 'L' + x0 + ' ' + (y0 + 2) + 'Q' + (x0 + bw / 2) + ' ' + (y0 - 2) + ' ' + (x0 + bw) + ' ' + (y0 + 1) + 'L' + (x0 + bw) + ' ' + y1 + 'Z', c, fid);
    });
    s += '<text x="' + cx + '" y="' + (H - 7) + '" text-anchor="middle">' + MES_KR.at(m) + '</text>';
  });
  const last = data[data.length - 1], z = last.inc - last.exp;
  if (last.inc > 0 && W > 360) {
    const cx = l + sl * (data.length - 0.5), y = Y(Math.max(last.inc, last.exp)) - 10;
    s += '<text x="' + (cx - 4) + '" y="' + Math.max(14, y) + '" text-anchor="end" class="anot">' + (z >= 0 ? '+' : '−') + kc(Math.abs(z)) + '</text>';
  }
  svg.innerHTML = s;
}

const oblouk = (cx, cy, r0, r1, a0, a1) => {
  const p = (r, a) => (cx + r * Math.cos(a)).toFixed(1) + ' ' + (cy + r * Math.sin(a)).toFixed(1), big = a1 - a0 > Math.PI ? 1 : 0;
  return 'M' + p(r1, a0) + 'A' + r1 + ' ' + r1 + ' 0 ' + big + ' 1 ' + p(r1, a1) + 'L' + p(r0, a1) + 'A' + r0 + ' ' + r0 + ' 0 ' + big + ' 0 ' + p(r0, a0) + 'Z';
};
// Koláč (mezikruží) kategorií; klepnutá výseč se „zvedne“ jako vystřihovánka
export function grafKolac(svg, kats, sel, stred) {
  const W = svg.clientWidth, H = svg.clientHeight, fid = svg.id + '-akv', cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 12, r0 = R * 0.58;
  const tot = kats.reduce((a, k) => a + k.v, 0);
  if (!tot) { svg.innerHTML = '<text x="' + cx + '" y="' + cy + '" text-anchor="middle">Zatím žádné výdaje</text>'; return; }
  let a = -Math.PI / 2, s = akvDefs(fid);
  kats.forEach(k => {
    const da = k.v / tot * Math.PI * 2, mid = a + da / 2, on = sel === k.id, off = on ? 9 : 0;
    s += '<g data-act="kslice" data-id="' + k.id + '" class="vysec' + (on ? ' on' : '') + '" transform="translate(' + (Math.cos(mid) * off).toFixed(1) + ' ' + (Math.sin(mid) * off).toFixed(1) + ')" role="button" aria-label="' + k.n + ' ' + kc(k.v) + '">' +
      akv(oblouk(cx, cy, r0, R, a + 0.012, a + da - 0.012), k.c, fid) + '</g>';
    a += da;
  });
  s += '<text x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle" class="stred1">' + stred[0] + '</text><text x="' + cx + '" y="' + (cy + 18) + '" text-anchor="middle" class="stred2">' + stred[1] + '</text>';
  if (stred[2]) s += '<text x="' + cx + '" y="' + (cy + 36) + '" text-anchor="middle" class="stred2">' + stred[2] + '</text>';
  svg.innerHTML = s;
}
// Budík plánu: kolik z plánovaných výdajů je utraceno; ryska ukazuje, kolik měsíce uplynulo
export function grafBudik(svg, utraceno, plan, cast) {
  const { ui } = barvyStranky(), W = svg.clientWidth, H = svg.clientHeight, fid = svg.id + '-akv', cx = W / 2, cy = H - 18, R = Math.min(W / 2 - 14, H - 30), r0 = R * 0.74;
  const p = plan > 0 ? utraceno / plan : 0, A = q => Math.PI + Math.PI * Math.min(1, Math.max(0, q));
  const rychle = p > cast * 1.05, c = rychle ? '#ef8a3c' : '#4c9a5a';
  let s = akvDefs(fid) + '<path d="' + oblouk(cx, cy, r0, R, Math.PI, 2 * Math.PI) + '" fill="' + ui + '" fill-opacity=".08"/>';
  if (p > 0) s += akv(oblouk(cx, cy, r0, R, Math.PI, A(p)), c, fid);
  const ar = A(cast);
  s += '<line x1="' + (cx + (r0 - 6) * Math.cos(ar)) + '" y1="' + (cy + (r0 - 6) * Math.sin(ar)) + '" x2="' + (cx + (R + 6) * Math.cos(ar)) + '" y2="' + (cy + (R + 6) * Math.sin(ar)) + '" stroke="' + ui + '" stroke-width="2" stroke-dasharray="3 3"/>';
  s += '<text x="' + cx + '" y="' + (cy - 14) + '" text-anchor="middle" class="stred1">' + Math.round(p * 100) + ' %</text><text x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle" class="stred2">plánu utraceno</text>';
  svg.innerHTML = s;
}
function barvyStranky() { const cs = getComputedStyle(document.body); return { ui: cs.getPropertyValue('--ui').trim() || '#333', ink: cs.getPropertyValue('--ink').trim() }; }
