const nivå = process.env.LOGG_NIVAA || 'info'

function skriv (type, melding) {
  if (type === 'debug' && nivå !== 'debug') return
  console.log(`${new Date().toISOString()} [${type}] ${melding}`)
}

module.exports = {
  debug: (m) => skriv('debug', m),
  info: (m) => skriv('info', m),
  warn: (m) => skriv('warn', m),
  error: (m) => skriv('error', m)
}
