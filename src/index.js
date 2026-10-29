// Startpunktet: npm start -- "spørsmålet ditt"
import fs from 'node:fs';
import { kjørAgent } from './agent.js';
import { system, eksempelOppgave, verktøy } from './verktoy.js';

try {
  process.loadEnvFile();
} catch {
  // Ingen .env — da må ANTHROPIC_API_KEY være satt i miljøet.
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Mangler ANTHROPIC_API_KEY. Kopier .env.example til .env og lim inn nøkkelen.');
  process.exit(1);
}

// --rapport skriver det ferdige svaret til nekrologer.md.
const args = process.argv.slice(2);
const lagRapport = args.includes('--rapport');
const oppgave = args.filter((a) => a !== '--rapport').join(' ') || eksempelOppgave;
console.log(`\n🎃 ${oppgave}\n`);

const svar = await kjørAgent({ system, oppgave, verktøy });

if (lagRapport) {
  const tekst = svar?.content?.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  if (tekst) {
    fs.writeFileSync('nekrologer.md', `${tekst}\n`);
    console.log('\n📜 Skrev nekrologer.md');
  } else {
    console.log('\n✖ Ingen ferdig rapport å skrive.');
  }
}
