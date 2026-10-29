const path = require('path')
const cron = require('node-cron')
const logger = require('../utils/logger')

// Handler oppgis som "fil.funksjon", f.eks. "rydding.ryddGamleBookinger".
function finnHandler (spesifikasjon) {
  const [fil, funksjon] = spesifikasjon.split('.')
  const modul = require(path.join(__dirname, fil))
  return modul[funksjon]
}

function startJobber (jobber = []) {
  for (const jobb of jobber) {
    const handler = finnHandler(jobb.handler)
    cron.schedule(jobb.cron, () => {
      logger.info(`Kjører jobb ${jobb.navn}`)
      handler()
    })
  }
}

module.exports = { startJobber }
