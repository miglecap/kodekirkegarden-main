// Verktøyene agenten kan bruke. Et verktøy er en definisjon (det modellen ser)
// og en kjør-funksjon (det som faktisk skjer). kjør: null betyr stub: den
// sendes ikke til modellen før dere har implementert den.
import fs from 'node:fs';
import path from 'node:path';

export const REPO = path.resolve(import.meta.dirname, '../hjemsokt-repo');
export const GIT_LOGG = path.resolve(import.meta.dirname, '../data/git-logg.json');

export const system = `Du er graver på kodekirkegården. Du leter etter død kode i repoet hjemsokt-repo:
funksjoner ingen kaller, pakker ingen importerer, utkommentert kode, gamle TODO-er,
tester som alltid skippes og feature-flagg som aldri endres.
Undersøk før du konkluderer: finn noe mistenkelig, sjekk om noe bruker det, og gå videre.
Start med list_filer og avhengigheter, så du ser hele repoet og hvilke pakker som faktisk brukes.

Før du kaller noe «Trygt», sjekk indirekte bruk: navnet som streng i config (f.eks. jobber og
plugins), dynamisk import, npm-scripts, og kommentarer eller README som nevner andre repoer.
Kode som ingen kaller direkte kan likevel være i bruk.

Skriv svaret slik:
## Nekrolog: <fil eller symbol>
- Dom: Trygt / Usikkert / Behold
- Hva det var: én–to setninger
- Sist rørt: dato og forfatter, og hvor mange år siden
- Bevis: søkene og verktøyene du brukte, og hva de ga (f.eks. «0 referanser»)
- Usikkerhet: hva du ikke har kunnet sjekke
Avslutt med «## Skal IKKE fjernes»: ting som ser døde ut, men er i bruk, med begrunnelse.
Bruk bare fakta fra verktøyene. Er noe ikke undersøkt, si det i stedet for å gjette.
Svar på norsk.`;

export const eksempelOppgave = 'Finn død kode i hjemsokt-repo og skriv en nekrolog for det tryggeste funnet.';

const MAKS_TREFF = 50;

function alleFiler(mappe) {
  return fs.readdirSync(mappe, { withFileTypes: true }).flatMap((d) => {
    if (d.name === 'node_modules' || d.name === '.git') return [];
    const full = path.join(mappe, d.name);
    return d.isDirectory() ? alleFiler(full) : [full];
  });
}

function sokIRepo({ monster, regex = false, maks_treff = MAKS_TREFF } = {}) {
  if (typeof monster !== 'string' || !monster.trim()) {
    throw new Error('Mangler «monster». Send f.eks. {"monster": "TODO"} eller {"monster": "require\\\\(", "regex": true}.');
  }
  let test;
  if (regex) {
    let re;
    try {
      re = new RegExp(monster, 'i');
    } catch (e) {
      throw new Error(`Ugyldig regex «${monster}»: ${e.message}`);
    }
    test = (linje) => re.test(linje);
  } else {
    const nål = monster.toLowerCase();
    test = (linje) => linje.toLowerCase().includes(nål);
  }

  const grense = Math.min(Math.max(1, Number(maks_treff) || MAKS_TREFF), 200);
  const treff = [];
  let totalt = 0;
  for (const fil of alleFiler(REPO)) {
    const linjer = fs.readFileSync(fil, 'utf8').split('\n');
    linjer.forEach((linje, i) => {
      if (!test(linje)) return;
      totalt++;
      if (treff.length < grense) treff.push(`${path.relative(REPO, fil)}:${i + 1}: ${linje.trim()}`);
    });
  }

  if (totalt === 0) {
    const tips = !regex && /[|\\^$*+?()[\]{}]/.test(monster)
      ? ' Mønsteret inneholder regex-tegn, men regex er ikke slått på: søket tok det som vanlig tekst. Prøv regex: true.'
      : '';
    return `Ingen treff på «${monster}».${tips}`;
  }
  const hale = totalt > treff.length ? `\n… ${totalt - treff.length} treff til. Snevre inn søket.` : '';
  return treff.join('\n') + hale;
}

// Fjerner /* */ og // fra JS-kode, så utkommentert bruk ikke teller som bruk.
// «:» foran // lar URL-er i strenger stå.
function utenKommentarer(kode) {
  return kode.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

function avhengighetsRapport() {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
  const filer = alleFiler(REPO).filter((f) => path.basename(f) !== 'package.json');
  const jsFiler = filer.filter((f) => f.endsWith('.js'));
  const andre = filer.filter((f) => !f.endsWith('.js'));

  const kode = jsFiler.map((f) => ({ fil: path.relative(REPO, f), rå: fs.readFileSync(f, 'utf8') }));
  const scripts = Object.entries(pkg.scripts ?? {});

  const linjer = [];
  const alle = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const navn of Object.keys(alle)) {
    const type = pkg.dependencies?.[navn] ? 'dependencies' : 'devDependencies';
    const unnsluppet = navn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const streng = new RegExp(`['"\`]${unnsluppet}(/[^'"\`]*)?['"\`]`);
    const ord = new RegExp(`(^|[\\s/])${unnsluppet}(\\s|$)`);
    // eslint-config-standard refereres som «standard» i .eslintrc.json.
    const kortnavn = navn.replace(/^eslint-config-/, '');

    const iKode = kode.filter((k) => streng.test(utenKommentarer(k.rå))).map((k) => k.fil);
    const kunKommentar = kode.filter((k) => streng.test(k.rå) && !streng.test(utenKommentarer(k.rå))).map((k) => k.fil);
    const iScripts = scripts.filter(([, cmd]) => ord.test(cmd)).map(([n]) => `npm run ${n}`);
    const iConfig = andre
      .filter((f) => new RegExp(`['"](${unnsluppet}|${kortnavn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})['"]`).test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(REPO, f));

    const deler = [
      `kode: ${iKode.join(', ') || 'ingen'}`,
      `scripts: ${iScripts.join(', ') || 'ingen'}`,
      `config: ${iConfig.join(', ') || 'ingen'}`,
    ];
    if (kunKommentar.length) deler.push(`KUN i kommentarer: ${kunKommentar.join(', ')}`);
    const ubrukt = !iKode.length && !iScripts.length && !iConfig.length;
    linjer.push(`${ubrukt ? '✖ UBRUKT ' : '  '}${navn} (${type}) — ${deler.join(' | ')}`);
  }
  return linjer.join('\n') +
    '\n\nMerk: «bruk» betyr at navnet står som streng i uutkommentert kode, i npm-scripts eller i config. ' +
    'Pakker brukt bare av én fil dør med den fila.';
}

export const verktøy = [
  {
    definisjon: {
      name: 'list_filer',
      description:
        'Lister alle filene i hjemsokt-repo med antall linjer. Bruk det først for å se hva som finnes, ' +
        'og for å finne riktig sti til les_fil og hent_git_historikk. Oppgi mappe for å snevre inn.',
      input_schema: {
        type: 'object',
        properties: {
          mappe: { type: 'string', description: 'Valgfri mappe relativt til hjemsokt-repo, f.eks. "src/utils".' },
        },
      },
    },
    kjør: async ({ mappe = '' } = {}) => {
      const rot = path.resolve(REPO, mappe);
      if (rot !== REPO && !rot.startsWith(REPO + path.sep)) throw new Error('Mappa må ligge i hjemsokt-repo');
      if (!fs.existsSync(rot) || !fs.statSync(rot).isDirectory()) throw new Error(`Fant ikke mappa «${mappe}».`);
      return alleFiler(rot)
        .map((f) => `${path.relative(REPO, f)} (${fs.readFileSync(f, 'utf8').split('\n').length} linjer)`)
        .join('\n');
    },
  },
  {
    definisjon: {
      name: 'avhengigheter',
      description:
        'Går gjennom alle pakkene i package.json (dependencies og devDependencies) og viser for hver ' +
        'hvor den brukes: i uutkommentert kode, i npm-scripts, i config, eller bare i kommentarer. ' +
        'Pakker uten bruk er merket UBRUKT. Bruk det i stedet for å søke pakke for pakke.',
      input_schema: { type: 'object', properties: {} },
    },
    kjør: async () => avhengighetsRapport(),
  },
  {
    definisjon: {
      name: 'sok_i_repo',
      description:
        'Søker gjennom alle filene i hjemsokt-repo (kode, tester, config, package.json) og returnerer ' +
        'treff som «fil:linje: tekst». Bruk det for å finne hvor noe er definert eller brukt, f.eks. et ' +
        'funksjonsnavn, et pakkenavn, "TODO", "it.skip" eller "featureFlags". Vanlig tekstsøk uten ' +
        'hensyn til store og små bokstaver. Sett regex: true for regulære uttrykk. Gir maks 50 treff ' +
        'som standard, så søk smalt hvis du får for mange.',
      input_schema: {
        type: 'object',
        properties: {
          monster: { type: 'string', description: 'Teksten eller regexen du søker etter.' },
          regex: { type: 'boolean', description: 'Tolk monster som regulært uttrykk. Standard false.' },
          maks_treff: { type: 'number', description: 'Maks antall treff (1–200). Standard 50.' },
        },
        required: ['monster'],
      },
    },
    kjør: async (input) => sokIRepo(input),
  },
  {
    definisjon: {
      name: 'les_fil',
      description:
        'Leser innholdet i én fil i hjemsokt-repo, med linjenumre. Oppgi stien relativt til roten av ' +
        'repoet, f.eks. "src/services/bookingService.js". Bruk det når et søketreff ser mistenkelig ut ' +
        'og du trenger å se sammenhengen rundt.',
      input_schema: {
        type: 'object',
        properties: {
          fil: { type: 'string', description: 'Sti relativt til hjemsokt-repo.' },
        },
        required: ['fil'],
      },
    },
    kjør: async ({ fil }) => {
      if (typeof fil !== 'string' || !fil.trim()) throw new Error('Mangler «fil».');
      const full = path.resolve(REPO, fil);
      if (!full.startsWith(REPO + path.sep)) throw new Error('Fila må ligge i hjemsokt-repo');
      if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
        throw new Error(`Fant ikke fila «${fil}». Bruk sok_i_repo for å finne riktig sti.`);
      }
      return fs.readFileSync(full, 'utf8')
        .split('\n')
        .map((linje, i) => `${i + 1}: ${linje}`)
        .join('\n');
    },
  },
  {
    definisjon: {
      name: 'finn_referanser',
      description:
        'Finner alle steder et navn (funksjon, variabel, pakke eller fil) brukes i hjemsokt-repo, ' +
        'utenom der det er definert. Svarer med en liste over filer og linjer, og sier tydelig fra hvis ' +
        'det ikke finnes noen. Husk at kode kan brukes indirekte: via strenger i config, dynamisk ' +
        'import, npm-scripts eller fra andre repoer. Null treff betyr ikke alltid at noe er dødt.',
      input_schema: {
        type: 'object',
        properties: {
          navn: { type: 'string', description: 'Navnet du vil finne bruk av, f.eks. "beregnRabatt" eller "moment".' },
        },
        required: ['navn'],
      },
    },
    kjør: async ({ navn }) => {
      if (typeof navn !== 'string' || !navn.trim()) throw new Error('Mangler «navn».');
      const unnsluppet = navn.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const svar = sokIRepo({ monster: `\\b${unnsluppet}\\b`, regex: true, maks_treff: 200 });
      const definisjon = new RegExp(
        `(function\\s*\\*?\\s+${unnsluppet}\\b|\\b(const|let|var)\\s+${unnsluppet}\\s*=|^"${unnsluppet}"\\s*:)`,
        'i',
      );
      const bruk = svar.split('\n').filter((l) => /^.+:\d+: /.test(l) && !definisjon.test(l.replace(/^.+?:\d+: /, '')));
      if (bruk.length === 0) {
        return `Ingen referanser til «${navn}» utenom definisjonen. Det betyr ikke alltid at det er dødt: ` +
          'sjekk config-strenger, dynamisk import, npm-scripts og andre repoer (les README).';
      }
      return bruk.join('\n');
    },
  },
  {
    definisjon: {
      name: 'hent_git_historikk',
      description:
        'Henter commit-historikken for én fil i hjemsokt-repo: dato, forfatter og melding, nyeste først. ' +
        'Bruk det for å si når noe sist ble rørt og av hvem, f.eks. «sist endret av Mona i 2021».',
      input_schema: {
        type: 'object',
        properties: {
          fil: { type: 'string', description: 'Sti relativt til hjemsokt-repo, f.eks. "src/utils/legacyCsv.js".' },
        },
        required: ['fil'],
      },
    },
    kjør: async ({ fil }) => {
      if (typeof fil !== 'string' || !fil.trim()) throw new Error('Mangler «fil».');
      const logg = JSON.parse(fs.readFileSync(GIT_LOGG, 'utf8'));
      const historikk = logg.filer[fil];
      if (!historikk) {
        throw new Error(`Ingen git-historikk for «${fil}». Filer i loggen: ${Object.keys(logg.filer).join(', ')}`);
      }
      const sist = historikk[0].dato;
      const arSiden = Math.floor((Date.now() - new Date(sist)) / (365.25 * 24 * 36e5));
      return { fil, merknad: logg.merknad, sist_endret: sist, ar_siden_sist_endret: arSiden, commits: historikk };
    },
  },
];
