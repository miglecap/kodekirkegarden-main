// Ny kalendervisning. Startet som pilot i 2021, ligger bak featureFlags.nyKalender.
const dayjs = require('dayjs')
const db = require('../db')

function lagUkevisning (uke) {
  const start = uke ? dayjs(uke) : dayjs().startOf('week')
  const dager = Array.from({ length: 5 }, (_, i) => start.add(i, 'day'))
  return dager.map((d) => ({
    dato: d.format('YYYY-MM-DD'),
    bookinger: db.bookinger.filter((b) => dayjs(b.fra).isSame(d, 'day'))
  }))
}

// TODO (2021-11-04): dra-og-slipp. Venter på designavklaring.
function flyttBooking (id, nyttTidspunkt) {
  throw new Error('Ikke implementert')
}

module.exports = { lagUkevisning, flyttBooking }
