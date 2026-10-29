// Demoen: to oppgaver i rekkefølge, en graving og en kontrast.
// npm run demo                  live mot API-et, og tar opp hver kjøring i demo/opptak/
// npm run demo -- --opptak      spiller av siste opptak uten nett og API-nøkkel
// npm run demo -- --uten-pause  hopper over «trykk Enter» mellom oppgavene
import fs from 'node:fs';
import readline from 'node:readline/promises';

const OPPTAK = new URL('../demo/opptak/', import.meta.url);

const oppgaver = [
  {
    id: '1-graving',
    tittel: 'Graving: en nekrolog for legacyCsv.js',
    oppgave: 'Finn ut om src/utils/legacyCsv.js er død kode, og skriv en nekrolog for den.',
  },
  {
    id: '2-kontrast',
    tittel: 'Kontrast: agenten skal si nei',
    oppgave: 'Er formaterBookingForLonn trygg å fjerne?',
  },
];

const args = process.argv.slice(2);
const spillAv = args.includes('--opptak');
const utenPause = args.includes('--uten-pause');

const ventPåEnter = async () => {
  if (utenPause || !process.stdin.isTTY) return;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await rl.question('\n⏎  Trykk Enter for neste oppgave… ');
  rl.close();
};

const hvil = (ms) => new Promise((r) => setTimeout(r, ms));

// Verktøykall får tid til å «tenke», svarteksten flyter raskere.
function forsinkelse(linje) {
  if (linje.includes('→')) return 700;
  if (linje.includes('✓') || linje.includes('✖')) return 250;
  return 35;
}

async function spillAvOpptak(oppgave) {
  const fil = new URL(`${oppgave.id}.txt`, OPPTAK);
  if (!fs.existsSync(fil)) {
    console.error(`Fant ikke opptaket ${oppgave.id}.txt. Kjør «npm run demo» live først.`);
    process.exit(1);
  }
  for (const linje of fs.readFileSync(fil, 'utf8').split('\n')) {
    console.log(linje);
    await hvil(forsinkelse(linje));
  }
}

// Kjører agenten live og tar vare på alt som skrives ut, til opptaket.
async function kjørLive(oppgave) {
  const { kjørAgent } = await import('./agent.js');
  const { system, verktøy } = await import('./verktoy.js');

  const linjer = [];
  const original = console.log;
  console.log = (...deler) => {
    linjer.push(...deler.join(' ').split('\n'));
    original(...deler);
  };
  try {
    console.log(`\n🎃 ${oppgave.oppgave}\n`);
    await kjørAgent({ system, oppgave: oppgave.oppgave, verktøy });
  } finally {
    console.log = original;
  }
  fs.mkdirSync(OPPTAK, { recursive: true });
  fs.writeFileSync(new URL(`${oppgave.id}.txt`, OPPTAK), linjer.join('\n'));
}

if (!spillAv) {
  try {
    process.loadEnvFile();
  } catch {
    // Ingen .env — da må ANTHROPIC_API_KEY være satt i miljøet.
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Mangler ANTHROPIC_API_KEY. Bruk «npm run demo -- --opptak» for å spille av siste opptak.');
    process.exit(1);
  }
}

for (const [i, oppgave] of oppgaver.entries()) {
  console.log(`\n${'─'.repeat(60)}\n🪦 ${oppgave.tittel}${spillAv ? '  (opptak)' : ''}\n${'─'.repeat(60)}`);
  if (spillAv) await spillAvOpptak(oppgave);
  else await kjørLive(oppgave);
  if (i < oppgaver.length - 1) await ventPåEnter();
}
