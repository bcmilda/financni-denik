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
- Data: `users/{uid}/{ucet|nast|kats|pen|e|notes|stk|pred|vozy|ukoly}`. Zápisy **po položkách**
  (`store.zapis(['e', id], objekt)`), nikdy celý deník.
- **Pravidla:** zápis jen na úrovni sekcí, ne na `users/$uid` (kaskáda pravidel v RTDB by jinak povolila vše pod ní).
  `ucet` jde zapsat jen jednou a `trialDo` max. 31 dní dopředu.
- Fotka účtenky: zmenšená na 480 px, JPEG 0,6, uložená v RTDB (`stk/{id}/img`, limit 150 000 znaků).
  Firebase Storage by vyžadoval placený tarif Blaze.
- Zvýraznění v zápisku se ukládá jako `{{y|text}}` (y/p/g/b/o), nikdy jako HTML.

## Postup práce
1. Změna kódu → `node tests/logic.test.mjs` a `node tests/store.test.mjs`.
2. Zvýšit verzi v `js/util.js` (VERZE), v `sw.js` (CACHE) a v hlavičkách souborů.
3. Nasazení: nejdřív `firebase deploy --only database` (když se měnila pravidla), pak hosting.

## Verze
- **0.1.0** (21. 11. 2026) – první verze: kniha, 6 vzhledů, Den/Měsíc/Tankování/Úkolníček/Kategorie/Hledat,
  přihlášení, synchronizace, offline, zkušební měsíc.

## Známé limity a TODO
- Zkušební doba se zakládá v prohlížeči (pravidla hlídají max. 31 dní). Po zavedení plateb ověřovat ve workeru.
- AI čtení účtenek (worker) – fáze 5. Teď se částka z fotky doplní ručně.
- Převody mezi peněženkami zatím nejsou.
- Týdenní list, Dlužníček, obálky, teploměr cíle, narozeniny, nákupní seznam – fáze 3–4.
- Stripe a placení – fáze 5. Propojení s FinanceFlow – fáze 6.
