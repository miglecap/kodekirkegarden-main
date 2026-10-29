# Kodekirkegården 🪦

![Megakart over oppgaven](kart.jpg)

Lag en agent som graver i et hjemsøkt repo, finner død kode og skriver nekrolog over det som trygt kan begraves.

## Kom i gang

```bash
npm install
cp .env.example .env        # lim inn API-nøkkelen fra Hekserådet
npm start                   # kjører eksempeloppgaven
npm start -- "Hvilke pakker i package.json brukes ikke?"
npm start -- --rapport      # skriver det ferdige svaret til nekrologer.md
```

## Verktøyene

Agenten har seks verktøy, alle i `src/verktoy.js`:

| Verktøy | Hva det gjør |
|---|---|
| `list_filer` | Lister alle filer i `hjemsokt-repo` med antall linjer |
| `avhengigheter` | For hver pakke i `package.json`: brukt i kode, npm-scripts, config, eller bare i kommentarer. Ubrukte er merket |
| `sok_i_repo` | Tekst- eller regex-søk i alle filer |
| `les_fil` | Leser én fil med linjenumre |
| `finn_referanser` | Alle steder et navn brukes, utenom definisjonen |
| `hent_git_historikk` | Commits for én fil, med årstall siden sist endret |

Detaljer om hvert verktøy, vern og begrensninger står i [docs/verktoy.md](docs/verktoy.md). Arkitekturdiagram: [docs/arkitektur.md](docs/arkitektur.md).

Systemprompten krever et fast svarformat: en nekrolog per funn med dom (`Trygt`, `Usikkert` eller `Behold`), bevis og usikkerhet, og til slutt en liste over det som **ikke** skal fjernes. Før noe kalles trygt må agenten ha sjekket indirekte bruk: config-strenger, dynamisk import, npm-scripts og andre repoer.

## Hva ligger her

```
src/
  index.js        startpunkt, leser spørsmålet fra kommandolinja
  agent.js        agentløkka: spør modellen, kjør verktøy, gjenta
  verktoy.js      systemprompt, eksempeloppgave og verktøyene
  demo.js         demoen: graving og kontrast, live eller fra opptak
eval/
  fasit.json      fasit: hva som er trygt, usikkert og felle
  poeng.js        poengsetting av svar mot fasiten
  kjor.js         kjører agenten på oppgavene og skriver resultat
demo/opptak/      opptak av siste live-demo, for avspilling uten nett
web/              animert gjennomgang av scenarioet (index.html, flow.js, app.js)
docs/             arkitektur, verktøy, scenario og flytskjema
hjemsokt-repo/    en intern bookingtjeneste med mye gammelt rusk
data/
  git-logg.json   commit-historikk per fil (dato, forfatter, melding)
```

Ikke kjør `npm install` inne i `hjemsokt-repo`. Det er et lik, ikke et prosjekt.

## Evaluering

```bash
npm run eval            # alle tre oppgavene
npm run eval -- lonn    # én oppgave, etter id
```

`eval/fasit.json` har tre oppgaver: et fullt sveip av repoet, «hvilke pakker brukes ikke?» og «er `formaterBookingForLonn` trygg å fjerne?». For hver sier fasiten hva som er trygt å begrave og hvilke **feller** agenten ikke skal anbefale å fjerne (kode som ser død ut, men brukes av et annet repo, lastes fra config eller kjøres fra npm-scripts).

Poengsettingen er ren tekstmatching: den teller hvor mange trygge funn som er nevnt, og slår alarm hvis en felle kalles trygg eller ubrukt. Linjene som utløser en felle skrives ut, så du kan vurdere dem selv. Den sier ikke om en dom er riktig begrunnet, så les svarene også. Kommandoen avslutter med feilkode 1 hvis en oppgave ikke består. Agenten er ikke deterministisk, så kjør gjerne flere ganger.

## Demo

```bash
npm run demo                  # live mot API-et, og tar opp hver kjøring
npm run demo -- --opptak      # spiller av siste opptak, uten nett og API-nøkkel
npm run demo -- --uten-pause  # hopper over «trykk Enter» mellom oppgavene
```

Demoen har to oppgaver: en nekrolog for `src/utils/legacyCsv.js` (agenten finner noe som trygt kan begraves), og så `formaterBookingForLonn` (agenten sier nei, fordi lønnsintegrasjonen i et annet repo bruker den). Verktøykallene vises mens agenten jobber. Opptakene ligger i `demo/opptak/` og overskrives hver gang du kjører live. Endrer du prompten eller verktøyene, ta opptaket på nytt.

## Visuell gjennomgang (web)

`web/index.html` er en animert gjennomgang av scenarioet: flytskjemaet lyser opp steg for steg, synkronisert med repoet, pakkelisten, funnene, PR-en og terminalen. Ingen bygg eller installasjon. Åpne fila i nettleseren, eller server mappa:

```bash
python3 -m http.server 5173 --directory web   # åpne http://localhost:5173
```

Styring: **Space** spill av/pause, **← →** forrige/neste steg, **Home** start på nytt, **F** kamera følger/viser hele flyten. Trykk på prikkene nederst for å hoppe til et steg. Hastighet velges nederst (0,5×–2×).

Agentens verktøykall i terminalen er hentet fra ekte kjøringer. PR-innhold, testresultater og svar fra økonomi og produkteier er illustrasjoner. Scenarioet er beskrevet i [docs/scenario.md](docs/scenario.md).

## Legg til et verktøy

Et verktøy er en `definisjon` (det modellen ser) og en `kjør`-funksjon (det som faktisk skjer). Verktøy med `kjør: null` er stubber og sendes ikke til modellen. Eksempel fra `les_fil`:

```js
kjør: async ({ fil }) => {
  const full = path.resolve(REPO, fil);
  if (!full.startsWith(REPO + path.sep)) throw new Error('Fila må ligge i hjemsokt-repo');
  return fs.readFileSync(full, 'utf8')
    .split('\n')
    .map((linje, i) => `${i + 1}: ${linje}`)
    .join('\n');
},
```

Kaster funksjonen en feil, får modellen feilmeldingen tilbake og kan prøve igjen. Beskrivelsen i `definisjon` er det modellen leser for å skjønne når verktøyet skal brukes, så skriv den som til en ny kollega. Sjekk alltid at stier ikke slipper ut av `hjemsokt-repo`.

## Hvis du ikke bruker JavaScript

Dataene er vanlige filer: `hjemsokt-repo/` er bare tekst, og `data/git-logg.json` er ren JSON. Bruk dem fra Python, Kotlin eller hva dere vil. Agentløkka i `src/agent.js` er lett å skrive om.

## Tips

- Vis verktøykallene i demoen. Det er de som viser at agenten faktisk jobber selv.
- `MAX_ITERASJONER` i `.env` stopper en agent som går i ring. Standard er 25. `MODELL` i `.env` bytter modell.
- Lange verktøysvar kuttes til 20 000 tegn, og hver kjøring avsluttes med antall runder, verktøykall og tokens.
- `.env` committes aldri. Den står allerede i `.gitignore`.
