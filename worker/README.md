# AI worker – lékařské zprávy a účtenky

Cloudflare Worker se dvěma službami:

- **`/vysvetli`**: přečte fotku nebo přepis lékařské zprávy a vrátí vysvětlení lidskou řečí (přepis, srozumitelný text, stav podle zprávy, pojmy, otázky pro lékaře). Používá ho **Kniha života → Lékařský archiv → Vysvětlit srozumitelně (AI)**.
- **`/uctenka`**: přečte fotku pokladní účtenky a vrátí obchod, datum, celkovou částku, položky a navrženou kategorii. Používá ho **Den → Vlepit účtenku z fotky** (čte automaticky), nebo tlačítko **Přečíst účtenku (AI)**.

Worker funguje jen pro přihlášené uživatele, protože ověřuje Firebase token. Nic neukládá.

## Nasazení (jednou, přes Cloudflare Dashboard – stejně jako u FinanceFlow)

1. Cloudflare → **Workers & Pages → Create → Worker**, název `financni-denik-ai`.
2. **Edit code** → vlož obsah `worker.js` → **Deploy**.
3. **Settings → Variables and Secrets:**
   - `ANTHROPIC_API_KEY` (Secret): klíč k Claude API.
   - `FIREBASE_API_KEY` (Secret): `apiKey` z Firebase konfigurace Finančního deníku.
   - `POVOLENE` (Text): adresy appky oddělené čárkou, např.
     `https://financni-denik.web.app,https://bcmilda.github.io`.
   - `MODEL` (Text, nepovinné): výchozí `claude-sonnet-4-6`.
   - `LIMIT_DEN` (Text, nepovinné): kolik AI požadavků smí jeden uživatel za den. Výchozí je 40.
4. **Nepovinný denní limit:** Workers → **KV → Create namespace** `financni-denik-limity`. Pak ve workeru **Settings → Bindings → KV namespace** přidej proměnnou `LIMITY`. Bez tohoto kroku limit neplatí.
5. Adresu workeru (např. `https://financni-denik-ai.<účet>.workers.dev`) vlož do `app/js/config.js` jako `AI_WORKER`.

Jedno přečtení účtenky nebo vysvětlení zprávy stojí řádově jednotky haléřů až korunu podle velikosti fotky. Platí se z účtu Claude API.
