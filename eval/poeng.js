// Poengsetting av agentsvar mot fasit. Ren tekstmatching, ingen API-kall.
// Avgjørende er «feller»: ting som ser døde ut, men ikke er det. Linjene som
// utløser en felle skrives ut, så et menneske kan avgjøre om det er et reelt
// treff eller bare en setning som sier at noe IKKE kan fjernes.

const ER_BEHOLD_SEKSJON = /^#+\s*(skal ikke fjernes|bør ikke fjernes)/i;

// Delen av svaret som anbefaler fjerning: alt før «Skal IKKE fjernes».
function anbefalingsdel(tekst) {
  const linjer = tekst.split('\n');
  const slutt = linjer.findIndex((l) => ER_BEHOLD_SEKSJON.test(l.trim()));
  return (slutt === -1 ? linjer : linjer.slice(0, slutt)).join('\n');
}

// «a|b» i fasiten betyr at enten a eller b teller som omtale.
const nevner = (tekst, navn) => navn.split('|').some((n) => tekst.toLowerCase().includes(n.toLowerCase()));

export function poeng(oppgave, tekst) {
  const del = anbefalingsdel(tekst);

  if (oppgave.forventet_dom) {
    const dom = tekst.match(/dom:?\*{0,2}\s*(trygt|usikkert|behold)/i)?.[1];
    return {
      id: oppgave.id,
      dom,
      bestått: dom?.toLowerCase() === oppgave.forventet_dom.toLowerCase(),
    };
  }

  const trygt = oppgave.trygt ?? [];
  const funnet = trygt.filter((n) => nevner(del, n));
  const mangler = trygt.filter((n) => !nevner(del, n));

  // En felle slår ut når en linje nevner den og kaller den trygg/ubrukt,
  // med mindre linja også sier «ikke».
  const felleTreff = [];
  for (const navn of oppgave.feller ?? []) {
    // «## Nekrolog: <felle>» med «Dom: Trygt» på en senere linje.
    for (const seksjon of del.split(/^(?=#+\s)/m)) {
      const [overskrift, ...resten] = seksjon.split('\n');
      if (nevner(overskrift, navn) && /dom:?\*{0,2}\s*trygt/i.test(resten.join('\n'))) {
        felleTreff.push({ felle: navn, linje: overskrift.trim() });
      }
    }
    for (const linje of del.split('\n')) {
      if (!nevner(linje, navn)) continue;
      if (!/trygt|ubrukt|kan fjernes|kan slettes/i.test(linje)) continue;
      if (/\bikke\b/i.test(linje)) continue;
      felleTreff.push({ felle: navn, linje: linje.trim() });
    }
  }

  return {
    id: oppgave.id,
    gjenfunnet: `${funnet.length}/${trygt.length}`,
    mangler,
    felleTreff,
    bestått: felleTreff.length === 0 && funnet.length >= Math.ceil(trygt.length / 2),
  };
}
