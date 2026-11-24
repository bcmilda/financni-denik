// Finanční deník · AI worker · v0.3.0
// Cloudflare Worker: POST /vysvetli – přečte lékařskou zprávu (fotka a/nebo přepis) a vysvětlí ji lidskou řečí.
// Nasazení a tajné klíče: viz worker/README.md.
//
// Bezpečnost:
// - Přístup jen pro přihlášené uživatele Finančního deníku: Firebase ID token se ověří u Google (accounts:lookup).
// - Fotka ani text se nikam neukládají; worker je jen pošle Claude API a vrátí odpověď appce.

const MAX_BODY = 600000; // znaků (fotka 800 px ≈ 100–250 tis.)

const SYSTEM = `Jsi trpělivý průvodce, který lidem bez lékařského vzdělání vysvětluje lékařské zprávy v češtině.
Dostaneš fotku nebo přepis zprávy (často zkratky, latina, rukopis). Úkol:
1. "prepis": přesný přepis textu zprávy (u fotky). Co nejde přečíst, označ [nečitelné]. Když dostaneš jen přepis, vrať ho beze změny.
2. "text": vysvětli srozumitelně, co ve zprávě stojí – věta po větě, bez latiny a zkratek. Jen to, co ve zprávě opravdu je.
3. "shrnuti": 1–3 věty o stavu tak, jak ho popisuje zpráva. Neutrálně: nestraš a neuklidňuj nad rámec zprávy.
   Pokud zpráva doporučuje kontrolu, léčbu nebo další vyšetření, napiš to.
4. "pojmy": seznam [pojem, vysvětlení] pro zkratky a odborné výrazy ze zprávy.
5. "otazky": 1–3 rozumné otázky, které se vyplatí položit lékaři.
Pravidla: nevymýšlej diagnózy ani hodnoty, které ve zprávě nejsou. Nedávej vlastní léčebná doporučení a neměň doporučení lékaře.
Když je něco nejasné, napiš, že je potřeba se zeptat lékaře.
Odpověz POUZE platným JSON objektem s klíči prepis, text, shrnuti, pojmy, otazky.`;

const cors = (origin, env) => {
  const ok = (env.POVOLENE || '').split(',').map(s => s.trim()).filter(Boolean);
  ok.push('https://localhost', 'capacitor://localhost'); // Android/iOS appka
  return {
    'Access-Control-Allow-Origin': ok.includes(origin) ? origin : ok[0] || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
};
const json = (data, status, h) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...h } });

async function overUzivatele(req, env) {
  const tok = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!tok || !env.FIREBASE_API_KEY) return null;
  const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + env.FIREBASE_API_KEY, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: tok }),
  });
  if (!r.ok) return null;
  const d = await r.json();
  return d.users && d.users[0] ? d.users[0].localId : null;
}

export default {
  async fetch(req, env) {
    const h = cors(req.headers.get('Origin') || '', env);
    if (req.method === 'OPTIONS') return new Response(null, { headers: h });
    const url = new URL(req.url);
    if (url.pathname !== '/vysvetli' || req.method !== 'POST') return json({ chyba: 'nenalezeno' }, 404, h);

    const uid = await overUzivatele(req, env);
    if (!uid) return json({ chyba: 'neprihlasen' }, 401, h);

    const raw = await req.text();
    if (raw.length > MAX_BODY) return json({ chyba: 'prilis_velke' }, 413, h);
    let b;
    try { b = JSON.parse(raw); } catch { return json({ chyba: 'spatny_pozadavek' }, 400, h); }
    const img = typeof b.img === 'string' ? b.img : '', prepis = String(b.prepis || '').slice(0, 15000);
    if (!img && !prepis) return json({ chyba: 'chybi_zprava' }, 400, h);

    const obsah = [];
    const m = img.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
    if (m) obsah.push({ type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } });
    obsah.push({ type: 'text', text:
      'Lékař/obor: ' + String(b.lekar || '–').slice(0, 200) + '\nDůvod návštěvy: ' + String(b.duvod || '–').slice(0, 300) +
      '\nVěk pacienta v době zprávy: ' + String(b.vek || 'neuveden').slice(0, 50) +
      (prepis ? '\n\nPřepis zprávy od uživatele:\n' + prepis : '\n\nZpráva je na fotce.') });

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: env.MODEL || 'claude-sonnet-4-6', max_tokens: 2500, system: SYSTEM, messages: [{ role: 'user', content: obsah }] }),
    });
    if (!r.ok) return json({ chyba: 'ai_' + r.status }, 502, h);
    const d = await r.json();
    const t = (d.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    const j = t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1);
    let v;
    try { v = JSON.parse(j); } catch { return json({ chyba: 'ai_format' }, 502, h); }
    return json({
      prepis: String(v.prepis || ''), text: String(v.text || ''), shrnuti: String(v.shrnuti || ''),
      pojmy: Array.isArray(v.pojmy) ? v.pojmy.filter(p => Array.isArray(p) && p.length >= 2).slice(0, 20).map(p => [String(p[0]), String(p[1])]) : [],
      otazky: Array.isArray(v.otazky) ? v.otazky.slice(0, 5).map(String) : [],
    }, 200, h);
  },
};
