# CLAUDE.md – Finanční deník

Pracovní jazyk: **čeština**. Milan není programátor: vysvětlovat jednoduše, u každé změny napsat
přesnou cestu na obrazovce (např. „Den → Zápis → Peněženka“).

## Co to je
Samostatná placená appka „Finanční deník“ (kniha / zápisník na peníze). Vychází z Deníku ve FinanceFlow
(`bcmilda/financeflow`, `js/projects.js`), ale je to **nový projekt s vlastním kódem, Firebase i Stripe**.
Deník ve FinanceFlow zůstává beze změny. Plán: dokument „Finanční deník – plán nové aplikace“.

## Zásady produktu
- Pochopitelné za minutu. Žádné skóre, COICOP, ČSÚ, osm druhů příjmu.
- Predikce měsíce se „zapíše perem“ a pak se už nemění; skutečnost se počítá živě ze zápisů.
- Téma (např. Tankování) je jen značka: výdaj zůstává ve své kategorii, nic se nepočítá dvakrát.
- Jeden zdroj pravdy pro peníze: `users/{uid}/e`.

## Technika
- Vanilla JS, ES moduly, bez build kroku. PWA (manifest + `sw.js`).
- Firebase Auth (Google, e-mail) + Realtime Database europe-west1. SDK 10.12.2 z gstatic, načítá se dynamicky
  jen při vyplněném `js/config.js`.
- Data: `users/{uid}/{ucet|nast|kats|pen|e|notes|stk|pred|vozy|ukoly|osoby|zivot|cile|trackery|pravidelne|nalepky|tydny}`. Zápisy **po položkách**
  (`store.zapis(['e', id], objekt)`), nikdy celý deník.
- **Pravidla:** zápis jen na úrovni sekcí, ne na `users/$uid` (kaskáda pravidel v RTDB by jinak povolila vše pod ní).
  `ucet` jde zapsat jen jednou a `trialDo` max. 31 dní dopředu.
- Fotka účtenky: zmenšená na 480 px, JPEG 0,6, uložená v RTDB (`stk/{id}/img`, limit 150 000 znaků).
  Firebase Storage by vyžadoval placený tarif Blaze.
- **Vzhled (0.4):** `nast` = {desky, stul, papir, linky, font, ink, rezim}. Linky se kreslí JEN v psacích plochách
  (`.lined`, výška řádku = rozteč linek `--lh`), jinak text „poskakuje“ mezi linkami. Staré `nast.skin` se převádí
  přes `STARE_SKINY` v data.js. Režim mění úvodní stránku a pořadí menu (REZIMY v data.js).
- Grafy „kreslené“: pero (wobble ve charts.js) a akvarel (SVG feTurbulence + feDisplacementMap). Bez knihoven.
- Písma jsou v appce (`app/fonts`, `css/fonty.css`), ne z Google Fonts – kvůli offline a Android appce.
- **0.5:** `cile/{id}` {nazev, cil, nasporeno, vzhled sklenice|teplomer|zed, vklady/{id}{d,kc}};
  `trackery/{id}` {nazev, osoba ('' = já), rezim ano|pocet, barva, dny/{YYYY-MM-DD}: počet};
  `pravidelne/{id}` {nazev, kc, den, kat, pen, od, aktivni}; zaplacená = zápis s `e.prav = id` v měsíci;
  `e.pocit` radost|nutnost|impulz (hodnotí jen uživatel). Rok v puntících počítá jen volné výdaje
  (bez byd/predpl a pravidelných) proti limitu dne (plán − pravidelné) ÷ dny.
- **0.6:** `nalepky/{id}` {kde ('den/YYYY-MM-DD', 'mesic/YYYY-MM', 'tyden/pondělí', 'rok/YYYY', název stránky), s L|R,
  druh (id nálepky | 'postit'), x (% šířky), y (px), r, v, text, c}; `tydny/{pondělí}` {pocasi, povedlo, prekvapilo, priste, hotovo};
  `stk/{id}` navíc {pol, ai {celkem, kat, datum, jistota}}; `nast.zavrena` (zavřená kniha při startu).
  Bílý výsek nálepek = SVG filtr `#fd-vyrez` v index.html. Otáčení listu: `kniha.js` (`listuj`), směr nastavuje `U.smer`.
  Kronika do PDF: `tisk.js` sází do `#tisk` (@media print); Android tiskne přes vlastní plugin `TiskPlugin` (PrintManager).
  AI účtenky: větší fotka (1100 px) jen v paměti, do RTDB jde 480 px; worker `/uctenka`, volitelný denní limit (KV `LIMITY`).
- Ocenění se počítají z dat (`oceneni()` v logic.js), nic se neukládá a nic se nebere zpět.
- Zvýraznění v zápisku se ukládá jako `{{y|text}}` (y/p/g/b/o), nikdy jako HTML.
- **Android:** Capacitor 8 (`android/`, appId `cz.financnidenik.app`, webDir `app`). Widget `ZapisWidget`
  a zkratky otevírají odkaz `financnidenik://zapis` (`?mic=1` = diktování); webová část ho chytá přes plugin App
  (`appUrlOpen`, `getLaunchUrl`) a otevře bloček. Diktování: vlastní plugin `DiktatPlugin` (RecognizerIntent),
  protože WebView neumí Web Speech API. APK staví GitHub Actions (`android.yml`) → Releases „Android náhled“.
- Náhledové APK je podepsané veřejným ladicím klíčem `android/app/nahled-debug.keystore` (heslo `android`).
  Klíč pro Google Play bude jiný a do repozitáře nepatří.
- **Kniha života:** `osoby/{id}` {jmeno, narozeni, vztah} a `zivot/{id}` {osoba, typ, d, …}; typy
  udalost, etapa (do), poznamka, lekar (lekar, duvod, prepis, img, vysv, pristi), ockovani (latka, proti, davka, sarze),
  zub (zub = číslo FDI, akce vypadl/prorezal), rust (vyska, vaha). Fotka zprávy 800 px JPEG 0,6 (limit 320 000 znaků).
  Appka zdraví nehodnotí ani nedoporučuje; AI jen vysvětluje text zprávy (worker/worker.js, prompt to hlídá).
- AI worker `worker/worker.js` (Cloudflare): POST /vysvetli a /uctenka, ověřuje Firebase ID token přes accounts:lookup,
  nic neukládá. Adresa v `js/config.js` → `AI_WORKER`.
- Google přihlášení v Android appce: popup ve WebView nefunguje → později plugin @capacitor-firebase/authentication.

## Postup práce
1. Změna kódu → `node tests/logic.test.mjs` a `node tests/store.test.mjs`.
2. Zvýšit verzi v `js/util.js` (VERZE), v `sw.js` (CACHE), `package.json`, `android/app/build.gradle` (versionName) a v hlavičkách souborů.
3. Nasazení: nejdřív `firebase deploy --only database` (když se měnila pravidla), pak hosting.

## Verze
- **0.6.0** (25. 11. 2026) – zavřená kniha a otáčení listů, nálepky a lepicí lístky, týdenní list s nedělním rituálem, kronika do PDF, AI čtení účtenek, tlačítko Vrátit.
- **0.5.0** (25. 11. 2026) – spořicí sklenice/teploměr/zeď, tracker pro sebe i děti, pravidelné platby s razítkem, razítko SPLNĚNO, emoce u výdajů, roční bilance v puntících, zvuky.
- **0.4.0** (25. 11. 2026) – finanční kronika: kožené desky s menu, Přehled s akvarelovými grafy, Pokladní kniha, Grafy a statistiky, Cíle, Ocenění, nový Vzhled (režimy, desky, stůl, papír, linky, písmo, barva písma), oprava linek.
- **0.3.0** (24. 11. 2026) – Kniha života: osoby, osa a mapa života, lékařský archiv s AI vysvětlením, očkovací průkaz, zoubky, růst.
- **0.2.0** (24. 11. 2026) – trhací bloček (rychlý zápis), zkratky ikony, Android appka s widgetem a diktováním.
- **0.1.0** (21. 11. 2026) – první verze: kniha, 6 vzhledů, Den/Měsíc/Tankování/Úkolníček/Kategorie/Hledat,
  přihlášení, synchronizace, offline, zkušební měsíc.

## Známé limity a TODO
- Zkušební doba se zakládá v prohlížeči (pravidla hlídají max. 31 dní). Po zavedení plateb ověřovat ve workeru.
- Převody mezi peněženkami zatím nejsou.
- Dlužníček, obálky, teploměr cíle, narozeniny, nákupní seznam – fáze 3–4.
- Stripe a placení – fáze 5. Propojení s FinanceFlow – fáze 6.
