const express = require('express')
const { opprettBooking, avlysBooking, hentBookingerForBruker } = require('../services/bookingService')
const { sendBekreftelse } = require('../services/varsling')

const ruter = express.Router()

ruter.get('/', (req, res) => {
  res.json(hentBookingerForBruker(req.bruker.id))
})

ruter.post('/', async (req, res) => {
  try {
    const booking = opprettBooking({ ...req.body, brukerId: req.bruker.id })
    await sendBekreftelse(req.bruker.epost, booking)
    res.status(201).json(booking)
  } catch (e) {
    res.status(409).json({ feil: e.message })
  }
})

ruter.delete('/:id', (req, res) => {
  avlysBooking(req.params.id, req.bruker.id)
  res.status(204).end()
})

module.exports = ruter
