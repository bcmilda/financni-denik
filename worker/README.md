# AI worker – vysvětlení lékařských zpráv

Cloudflare Worker, který přečte fotku nebo přepis lékařské zprávy a vrátí vysvětlení lidskou řečí
(přepis, srozumitelný text, stav podle zprávy, pojmy, otázky pro lékaře). Používá ho
**Kniha života → Lékařský archiv → Vysvětlit srozumitelně (AI)**.

Funguje jen pro přihlášené uživatele (ověřuje Firebase token). Nic neukládá.

## Nasazení (jednou, přes Cloudflare Dashboard – stejně jako u FinanceFlow)

1. Cloudflare → **Workers & Pages → Create → Worker**, název `financni-denik-ai`.
2. **Edit code** → vlož obsah `worker.js` → **Deploy**.
3. **Settings → Variables and Secrets:**
   - `ANTHROPIC_API_KEY` (Secret) – klíč k Claude API
   - `FIREBASE_API_KEY` (Secret) – `apiKey` z Firebase konfigurace Finančního deníku
   - `POVOLENE` (Text) – adresy appky oddělené čárkou, např.
     `https://financni-denik.web.app,https://bcmilda.github.io`
   - `MODEL` (Text, nepovinné) – výchozí `claude-sonnet-4-6`
4. Adresu workeru (např. `https://financni-denik-ai.<účet>.workers.dev`) vlož do `app/js/config.js` jako `AI_WORKER`.

Jedno vysvětlení stojí řádově jednotky haléřů až korunu podle velikosti fotky (platí se z účtu Claude API).
