# Verktøy og teknologi

To lag: **agentens verktøy** (det modellen kan kalle) og **applikasjonens verktøy** (det som kjører agenten, evalueringen og demoen).

## 1. Agentens verktøy

Definert i `src/verktoy.js`. Hvert verktøy har en `definisjon` (navn, beskrivelse og input-skjema som modellen leser) og en `kjør`-funksjon. Alle verktøyene er **kun lesende**: agenten kan ikke endre `hjemsokt-repo/`. Feil kastes som `Error` og sendes tilbake til modellen med `is_error: true`, så den kan prøve på nytt.

| Verktøy | Input | Returnerer |
|---|---|---|
| `list_filer` | `mappe?` | Filer med antall linjer |
| `avhengigheter` | ingen | Bruk per pakke i `package.json` |
| `sok_i_repo` | `monster`, `regex?`, `maks_treff?` | `fil:linje: tekst` |
| `les_fil` | `fil` | Filinnhold med linjenumre |
| `finn_referanser` | `navn` | Linjer der navnet brukes, utenom definisjonen |
| `hent_git_historikk` | `fil` | Commits, siste endring og alder i år |

### `list_filer`
- **Bruk:** første steg, for å se hva som finnes og få riktige stier.
- **Input:** `mappe` (valgfri, relativ til `hjemsokt-repo`, f.eks. `src/utils`).
- **Output:** én linje per fil: `src/utils/dato.js (23 linjer)`.
- **Vern:** mappa må ligge inni `hjemsokt-repo`, ellers feil. `node_modules` og `.git` hoppes over.

### `avhengigheter`
- **Bruk:** finne ubrukte pakker uten å søke pakke for pakke.
- **Hvordan:** går gjennom `dependencies` og `devDependencies`. For hver pakke sjekker den
  - **kode:** pakkenavnet som streng (`'moment'`, `"uuid"`, `'pakke/sti'`) i `.js`-filer, etter at kommentarer er fjernet
  - **scripts:** pakkenavnet som ord i en npm-script
  - **config:** pakkenavnet i andre filer, f.eks. `.eslintrc.json` (`eslint-config-` kuttes til `standard`)
  - **kommentarer:** treff som bare finnes i kommentarer, merket `KUN i kommentarer`
- **Output:** én linje per pakke. Pakker uten bruk er merket `✖ UBRUKT`.
- **Begrensninger:** den leser ikke `package.json` selv, og forstår ikke dynamiske `require` bygd av variabler. Config-sjekken er enkel tekstmatching, så en pakke kan telle som brukt fordi navnet tilfeldigvis står i en config-fil (f.eks. `jest` i `.eslintrc.json`). Pakker brukt av bare én fil dør med den fila. Det sier rapporten til slutt.

### `sok_i_repo`
- **Bruk:** finne hvor noe er definert eller brukt, og lete etter `TODO`, `it.skip`, `featureFlags`.
- **Input:** `monster` (tekst eller regex), `regex` (standard `false`), `maks_treff` (1–200, standard 50).
- **Output:** `fil:linje: tekst`, og en beskjed om hvor mange treff som ble kuttet.
- **Detaljer:** søker i alle filer (kode, tester, config, `package.json`, README), uavhengig av store og små bokstaver. Regex bruker flagget `i`.
- **Hjelp til modellen:** gir 0 treff og mønsteret inneholder regex-tegn (f.eks. `a|b`) uten `regex: true`, sier svaret fra om det. Dette fanget en reell feil: modellen rapporterte «0 treff» som bevis fordi den hadde glemt flagget.

### `les_fil`
- **Bruk:** se sammenhengen rundt et mistenkelig treff.
- **Input:** `fil`, relativ til `hjemsokt-repo`.
- **Output:** hele fila, én linje per linje, prefikset med linjenummer.
- **Vern:** stien løses opp og må starte med `hjemsokt-repo/`, så `../`-triks avvises. Feil hvis fila ikke finnes.

### `finn_referanser`
- **Bruk:** sjekke om en funksjon, variabel, pakke eller fil brukes.
- **Input:** `navn`.
- **Output:** alle linjer som inneholder navnet som helt ord, utenom definisjonslinjer (`function navn`, `const navn =`, `"navn":`). Maks 200 treff.
- **Ved 0 treff:** svaret sier at det ikke alltid betyr død kode, og minner om config-strenger, dynamisk import, npm-scripts og andre repoer.
- **Begrensninger:** teller også treff i kommentarer og i `module.exports`. Den skiller ikke mellom kall og omtale.

### `hent_git_historikk`
- **Bruk:** si når noe sist ble rørt, og av hvem.
- **Input:** `fil`, relativ til `hjemsokt-repo`.
- **Output:** `merknad` (f.eks. hvem som har sluttet), `sist_endret`, `ar_siden_sist_endret` (hele år, regnet fra dagens dato) og `commits` med hash, dato, forfatter og melding, nyeste først.
- **Datakilde:** `data/git-logg.json`, ikke ekte `git`. Mangler fila i loggen, får modellen en feil med listen over filer som finnes.
- **Begrensning:** historikken er per fil. Den sier ikke hvilken funksjon i fila en commit gjaldt.

## 2. Hvordan agentløkka bruker verktøyene

`src/agent.js`:

1. Sender oppgaven, systemprompten og verktøydefinisjonene til modellen.
2. Får modellen `stop_reason: tool_use`, kjøres alle verktøykallene den ber om, og resultatene sendes tilbake i én melding.
3. Gjentas til modellen svarer `end_turn`, avslår (`refusal`), blir kuttet (`max_tokens`) eller når `MAX_ITERASJONER`.

Sikkerhetsnett:

| Mekanisme | Verdi |
|---|---|
| Maks runder | 25 (`MAX_ITERASJONER`) |
| Maks tegn per verktøysvar | 20 000, resten kuttes med beskjed |
| Ukjent verktøynavn | feilmelding med gyldige navn |
| Feil i verktøy | sendes tilbake til modellen |
| Verktøy med `kjør: null` | sendes ikke til modellen |
| Oppsummering | runder, verktøykall og tokens skrives ut til slutt |

## 3. Applikasjonens verktøy og teknologi

| Del | Detalj |
|---|---|
| Kjøremiljø | Node.js ≥ 20.12, ES-moduler (`"type": "module"`) |
| Modell-SDK | `@anthropic-ai/sdk` ^1.1.0, `messages.create` med verktøybruk |
| Modell | `claude-sonnet-5-5` (kan byttes med `MODELL`), `effort: medium`, `max_tokens: 16000` |
| Miljøvariabler | `ANTHROPIC_API_KEY` (påkrevd), `MODELL`, `MAX_ITERASJONER`. Lastes fra `.env` med `process.loadEnvFile()` |
| Avhengigheter | Bare SDK-en. Ingen andre pakker, og `hjemsokt-repo/` skal ikke installeres |

Klienten og miljøvariablene leses inne i `kjørAgent`, ikke øverst i fila. `index.js` laster `.env` etter at importene er evaluert, så modulnivå ville sett tomme verdier.

### npm-kommandoer

| Kommando | Hva den gjør |
|---|---|
| `npm start` | Kjører eksempeloppgaven. `-- "spørsmål"` for egen oppgave, `-- --rapport` skriver `nekrologer.md` |
| `npm run eval` | Kjører tre oppgaver mot fasiten i `eval/fasit.json` og poengsetter svarene. `-- <id>` for én oppgave |
| `npm run demo` | Live demo med to oppgaver. Tar opp hver kjøring i `demo/opptak/` |
| `npm run demo -- --opptak` | Spiller av opptakene uten nett og API-nøkkel |

### Evaluering (`eval/`)
- `fasit.json`: per oppgave hva som er trygt å begrave, usikkert, og **feller** (ser dødt ut, men er i bruk).
- `poeng.js`: ren tekstmatching. Teller trygge funn nevnt før «Skal IKKE fjernes», og slår alarm hvis en felle kalles trygg eller ubrukt. Sjekker at `formaterBookingForLonn`-oppgaven ender med dom `Behold`.
- `kjor.js`: kjører agenten, samler svaret og skriver ✓/✖ per oppgave. Avslutter med feilkode 1 hvis noe feiler.
- **Begrensning:** poengsettingen vurderer ikke om begrunnelsen er riktig, bare hva som er nevnt og kalt trygt.

### Dokumentasjon
- `docs/arkitektur.md`: Mermaid-diagrammer (arkitektur, verktøy, kvalitetssikring).
- `docs/verktoy.md`: denne fila.
