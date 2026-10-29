const express = require('express')
const config = require('../../config/default')
const { hentLedigeRom } = require('../services/bookingService')
const { lagUkevisning } = require('../kalender/nyKalender')

const ruter = express.Router()

ruter.get('/ledige', (req, res) => {
  const { fra, til, kontor } = req.query
  res.json(hentLedigeRom({ fra, til, kontor }))
})

ruter.get('/kalender', (req, res) => {
  if (config.featureFlags.nyKalender) {
    return res.json(lagUkevisning(req.query.uke))
  }
  res.status(404).json({ feil: 'Ikke tilgjengelig' })
})

module.exports = ruter
