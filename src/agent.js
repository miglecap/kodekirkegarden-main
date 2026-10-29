// Agent-løkken. Hele «agent-greia» er dette: spør modellen, kjør verktøyene
// den ber om, send resultatene tilbake, gjenta til den er ferdig.
import Anthropic from '@anthropic-ai/sdk';

const grå = (t) => `\x1b[90m${t}\x1b[0m`;
const oransje = (t) => `\x1b[38;5;208m${t}\x1b[0m`;
const grønn = (t) => `\x1b[32m${t}\x1b[0m`;

export async function kjørAgent({ system, oppgave, verktøy }) {
  // Leses her og ikke øverst i fila: index.js laster .env først etter at
  // importene er evaluert, så modul-nivå ville sett tomme verdier.
  const MODELL = process.env.MODELL ?? 'claude-sonnet-5-5';
  // Stopper en agent som går i ring før den brenner opp kostnadstaket.
  const MAX_ITERASJONER = Number(process.env.MAX_ITERASJONER ?? 25);
  const klient = new Anthropic();

  // Bare verktøy med en kjør-funksjon sendes til modellen. Stubbene i
  // verktoy.js blir med av seg selv når dere implementerer dem.
  const aktive = verktøy.filter((v) => v.kjør);
  const etterNavn = new Map(aktive.map((v) => [v.definisjon.name, v]));

  const messages = [{ role: 'user', content: oppgave }];
  const bruk = { runder: 0, verktøykall: 0, inn: 0, ut: 0 };
  const oppsummer = () => console.log(grå(
    `\n${bruk.runder} runder, ${bruk.verktøykall} verktøykall, ${bruk.inn} tokens inn, ${bruk.ut} tokens ut`,
  ));

  for (let i = 1; i <= MAX_ITERASJONER; i++) {
    const svar = await klient.messages.create({
      model: MODELL,
      max_tokens: 16000,
      output_config: { effort: 'medium' },
      system,
      tools: aktive.map((v) => v.definisjon),
      messages,
    });

    bruk.runder++;
    bruk.inn += svar.usage?.input_tokens ?? 0;
    bruk.ut += svar.usage?.output_tokens ?? 0;
    messages.push({ role: 'assistant', content: svar.content });

    for (const blokk of svar.content) {
      if (blokk.type === 'text' && blokk.text.trim()) {
        console.log(svar.stop_reason === 'tool_use' ? grå(blokk.text) : blokk.text);
      }
    }

    if (svar.stop_reason === 'end_turn') {
      oppsummer();
      return svar;
    }
    if (svar.stop_reason === 'refusal') {
      console.log(oransje(`\n✖ Modellen avslo (${svar.stop_details?.category ?? 'ukjent grunn'}).`));
      oppsummer();
      return svar;
    }
    if (svar.stop_reason === 'max_tokens') {
      console.log(oransje('\n✖ Svaret ble kuttet (max_tokens).'));
      oppsummer();
      return svar;
    }

    // Modellen kan be om flere verktøy samtidig. Alle resultatene må tilbake
    // i én og samme melding.
    const kall = svar.content.filter((b) => b.type === 'tool_use');
    const resultater = [];
    for (const k of kall) {
      console.log(oransje(`→ ${k.name}`) + grå(` ${JSON.stringify(k.input)}`));
      bruk.verktøykall++;
      resultater.push(await kjørVerktøy(etterNavn, k));
    }
    messages.push({ role: 'user', content: resultater });
  }

  console.log(oransje(`\n✖ Stoppet etter ${MAX_ITERASJONER} runder (MAX_ITERASJONER).`));
  oppsummer();
}

// Holder en enkelt verktøyrespons fra å spise opp konteksten.
const MAKS_TEGN = 20000;

async function kjørVerktøy(etterNavn, kall) {
  const v = etterNavn.get(kall.name);
  if (!v) {
    return feil(kall, `Ukjent verktøy «${kall.name}». Gyldige: ${[...etterNavn.keys()].join(', ')}`);
  }
  try {
    const resultat = await v.kjør(kall.input);
    let tekst = typeof resultat === 'string' ? resultat : JSON.stringify(resultat, null, 2);
    console.log(grønn(`  ✓ ${tekst.length} tegn tilbake`));
    if (tekst.length > MAKS_TEGN) {
      tekst = `${tekst.slice(0, MAKS_TEGN)}\n… kuttet (${tekst.length - MAKS_TEGN} tegn til). Snevre inn forespørselen.`;
    }
    return { type: 'tool_result', tool_use_id: kall.id, content: tekst };
  } catch (e) {
    return feil(kall, e.message);
  }
}

function feil(kall, melding) {
  console.log(oransje(`  ✖ ${melding}`));
  return { type: 'tool_result', tool_use_id: kall.id, content: melding, is_error: true };
}
