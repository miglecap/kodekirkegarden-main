const config = require('../../config/default')
const logger = require('../utils/logger')

function autentiser (req, res, next) {
  if (config.featureFlags.brukLdap) {
    // LDAP-proxyen foran tjenesten setter disse headerne.
    const id = req.get('x-ldap-bruker')
    if (!id) return res.status(401).json({ feil: 'Ikke innlogget' })
    req.bruker = { id, epost: req.get('x-ldap-epost') }
    return next()
  }

  // Gammel basic auth fra før LDAP (2019). Kun for lokal utvikling, sa vi.
  const header = req.get('authorization') || ''
  const [bruker] = Buffer.from(header.replace('Basic ', ''), 'base64').toString().split(':')
  if (!bruker) return res.status(401).json({ feil: 'Ikke innlogget' })
  logger.warn(`Basic auth brukt av ${bruker}`)
  req.bruker = { id: bruker, epost: `${bruker}@firma.intern` }
  next()
}

module.exports = { autentiser }
