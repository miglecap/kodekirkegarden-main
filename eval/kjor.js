// Kjører agenten på oppgavene i fasit.json og poengsetter svarene.
// npm run eval            alle oppgaver
// npm run eval -- lonn    én oppgave, etter id
import fs from 'node:fs';
import { kjørAgent } from '../src/agent.js';
import { system, verktøy } from '../src/verktoy.js';
import { poeng } from './poeng.js';

try {
  process.loadEnvFile();
} catch {
  // Ingen .env — da må ANTHROPIC_API_KEY være satt i miljøet.
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Mangler ANTHROPIC_API_KEY. Kopier .env.example til .env og lim inn nøkkelen.');
  process.exit(1);
}

const fasit = JSON.parse(fs.readFileSync(new URL('./fasit.json', import.meta.url), 'utf8'));
const valgt = process.argv[2];
const oppgaver = fasit.oppgaver.filter((o) => !valgt || o.id === valgt);
if (oppgaver.length === 0) {
  console.error(`Ingen oppgave med id «${valgt}». Gyldige: ${fasit.oppgaver.map((o) => o.id).join(', ')}`);
  process.exit(1);
}

const resultater = [];
for (const oppgave of oppgaver) {
  console.log(`\n${'='.repeat(60)}\n🎃 [${oppgave.id}] ${oppgave.oppgave}\n${'='.repeat(60)}\n`);
  const svar = await kjørAgent({ system, oppgave: oppgave.oppgave, verktøy });
  const tekst = svar?.content?.filter((b) => b.type === 'text').map((b) => b.text).join('\n') ?? '';
  resultater.push(tekst ? poeng(oppgave, tekst) : { id: oppgave.id, bestått: false, merknad: 'Ingen svar (stoppet før ferdig).' });
}

console.log(`\n${'='.repeat(60)}\nRESULTAT\n${'='.repeat(60)}`);
for (const r of resultater) {
  console.log(`${r.bestått ? '✓' : '✖'} ${r.id}${r.gjenfunnet ? ` — gjenfunnet ${r.gjenfunnet}` : ''}${r.dom ? ` — dom: ${r.dom}` : ''}${r.merknad ? ` — ${r.merknad}` : ''}`);
  if (r.mangler?.length) console.log(`    ikke nevnt: ${r.mangler.join(', ')}`);
  for (const t of r.felleTreff ?? []) console.log(`    FELLE ${t.felle}: ${t.linje}`);
}
process.exitCode = resultater.every((r) => r.bestått) ? 0 : 1;
