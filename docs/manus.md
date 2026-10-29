# Manus: Kodekirkegården (5 minutter)

Talen er skrevet for rolig tempo, cirka 130 ord i minuttet. Tekst i `[hakeparenteser]` er regi og skjerm, ikke noe som leses opp. Tall i manus er målt i prosjektet. Det finnes ingen målt tidsbesparelse, så det er ikke brukt noe slikt tall.

---

## 0:00–0:30 · Problem og hvem det gjelder

`[SKJERM: tittelskjerm «Kodekirkegården 🪦», så første steg i gjennomgangen: «The trigger»]`

> Du har arvet en gammel tjeneste. Teamet som skrev den er borte, og ingen vet hva som kan slettes. Mye ser dødt ut, men er det ikke: en funksjon som et annet system bruker, en jobb som bare finnes som en tekststreng i config.
>
> Det rammer alle som forvalter eldre kode, for eksempel før en oppgradering eller en sikkerhetsgjennomgang. `[Legg inn eget tall her hvis dere har et, for eksempel timer per uke. Vi har ikke målt det.]`

## 0:30–1:00 · Løsningen i én setning

`[SKJERM: tittelskjerm igjen, eller flytskjemaet i full visning]`

> Kodekirkegården er en agent som graver i et repo, finner død kode og skriver en nekrolog for hvert funn: hva det var, når det sist ble rørt, og om det trygt kan begraves.
>
> Det som er annerledes: agenten er bygd til å si nei. Den sjekker indirekte bruk, forteller alltid hva som ikke skal fjernes, og kan bare lese. Den endrer ingen filer.

## 1:00–3:30 · Live-demo

Scenario: Jonas har overtatt Romvakt, en intern booking-tjeneste. Sikkerhetsgjennomgangen har flagget den avviklede pakken `request`, og en Node-oppgradering står for døren.

### 1:00–1:20 · Situasjonen

`[SKJERM: gjennomgangen, steg 1 og 2. Fanen «Context» med varslene og fellene]`

> Dette er Jonas. Sikkerhetsgjennomgangen sier at pakken `request` er avviklet. Han vil rydde før oppgraderingen, men se på disse fire: de ser døde ut. De er det ikke. Lønnsfunksjonen brukes av et annet repo, og nattjobben lastes fra en config-streng.

### 1:20–1:35 · Kommandoen

`[SKJERM: terminalen. Skriv eller vis kommandoen. Hvis nettet svikter: npm run demo -- --opptak]`

> Jonas starter agenten med én kommando og ber om en nekrolog for hvert funn han kan være trygg på.

### 1:35–2:10 · Agenten jobber

`[SKJERM: gjennomgangen, steg 3 til 8. Chipsene i agent-løkka tennes én etter én. Pek på verktøykallene i terminalen, så pakketabellen, så «0 references» på legacyCsv.js]`

> Se på verktøykallene. Agenten sjekker hver pakke: brukes den i kode, scripts eller config? Tre er ubrukte: `lodash`, `request` og `sinon`.
>
> `legacyCsv` har null referanser, og Mona rørte den sist i 2021. Hun har sluttet.
>
> Nå det viktigste steget: null kall betyr ikke død. Agenten leser config og finner at nattjobben og Teams-pluginen lastes ved navn. Dem lar den være.

### 2:10–2:30 · Rapporten

`[SKJERM: fanen «Findings». Kortene flyr inn i tre kolonner]`

> Resultatet er en rapport med tre svar. Trygt å begrave. Usikkert, må avklares. Og Behold, med begrunnelse.

### 2:30–3:00 · Menneskene i løkka

`[SKJERM: gjennomgangen, steg 11 til 15. PR-en vokser, meldingene, kortet som flytter seg]`

> Agenten har ikke slettet noe. Jonas åpner en liten pull request med bare det trygge. For `legacyCsv` spør han økonomi, for kalenderen spør han produkteier. Økonomi svarer ja, og filen blir med i PR-en. Produkteier svarer ikke, og da er standarden å beholde koden.

### 3:00–3:30 · Kontrollspørsmålet og resultatet

`[SKJERM: fanen «Actions», svaret «Dom: Behold». Så fanen «Result»]`

> Før Jonas rører lønnsfunksjonen, spør han agenten rett ut. Svaret er Behold, med README og en kodekommentar som bevis, og en påminnelse om at null treff her ikke betyr at den er død.
>
> Resultatet: fire avhengigheter borte, én åpen sak med en eier, og ingen felle slettet.

## 3:30–4:15 · Hvordan det er bygget

`[SKJERM: arkitekturdiagrammet fra docs/arkitektur.md]`

> Arkitekturen er enkel. En liten løkke spør Claude, Claude ber om et verktøy, verktøyet leser repoet, og svaret går tilbake til rapporten er ferdig.
>
> Agenten har seks verktøy: liste filer, sjekke avhengigheter, søke, lese, finne referanser og hente git-historikk. Alle er skrivebeskyttet.
>
> Det viktigste designvalget er at et menneske avgjør til slutt. Agenten gir bevis, og et fast svarformat tvinger den til å si hva den ikke har sjekket. En evaluering med feller slår alarm hvis den kaller noe trygt som ikke er det.

## 4:15–4:45 · Verdi og læring

`[SKJERM: «Result»-fanen, eller en enkel punktliste]`

> Bedre: i evalueringen fant agenten alle ni trygge funn og tok ingen felle, men det er én kjøring per oppgave, og agenten er ikke deterministisk.
>
> Fungerte ikke: den meldte «null treff» som bevis etter et søk uten regex. Verktøyet advarer nå. Poengsettingen sjekker bare hva som er nevnt, og vi har ikke målt tidsbesparelsen.
>
> Neste: et ekte repo, og la agenten se de andre repoene, som lønnsintegrasjonen.

## 4:45–5:00 · Avslutning

`[SKJERM: tittelskjerm]`

> Neste steg er et ekte system. Den passer for alle som overtar gammel kode. Poenget er ikke at agenten finner død kode, men at den vet når den skal si nei.

---

## Regi og opptak

- **Reserve for demoen:** `npm run demo -- --opptak` spiller av siste live-opptak uten nett og API-nøkkel.
- **Tempo:** gjennomgangen i `web/` er bevisst langsom. Bruk 1,5× eller 2×, eller trykk Neste-knappen i takt med talen, så ligger bildet på riktig sted.
- **Faktasjekk før publisering:** tallene (9 av 9, 1 min 12 s, 37 verktøykall, fire avhengigheter) er hentet fra prosjektets kjøringer. Svarene fra økonomi og produkteier, PR-innholdet og testresultatene er illustrasjoner, og bør sies slik hvis noen spør.
- **Ikke lov for mye:** hopp over formuleringer som «sparer timer», med mindre dere har et tall.
- **Ved ekstern deling:** gå gjennom manus og demo før de deles utenfor teamet.
