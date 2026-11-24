// Finanční deník · util.js · v0.3.0
// Drobné pomocné funkce bez vazby na stránku (testují se v Node).

export const VERZE = '0.3.0';
export const p2 = n => String(n).padStart(2, '0');
export const iso = d => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
export const pd = s => { const a = String(s).split('-').map(Number); return new Date(a[0], a[1] - 1, a[2] || 1); };
export const addD = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return iso(d); };
export const mk = s => String(s).slice(0, 7);
export const dim = ym => { const d = pd(ym + '-01'); return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); };
export const dnes = () => iso(new Date());
export const DNY = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
export const MG = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
export const MN = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'];
export const ymLabel = ym => MN[+ym.slice(5) - 1] + ' ' + ym.slice(0, 4);
export const datKratce = s => { const d = pd(s); return d.getDate() + '. ' + (d.getMonth() + 1) + '.'; };
export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const kc = n => Math.round(n || 0).toLocaleString('cs-CZ') + ' Kč';
export const kc2 = n => (n || 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kč';
export const nf = (n, d) => (n || 0).toLocaleString('cs-CZ', { minimumFractionDigits: d, maximumFractionDigits: d });
export const num = s => parseFloat(String(s).replace(/\s| /g, '').replace(',', '.'));
export const uid = () => Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 7);
export const vals = o => Object.values(o || {});
