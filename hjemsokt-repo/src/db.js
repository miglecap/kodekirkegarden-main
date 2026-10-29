// Enkel minnelagring. Byttes ut med Postgres "snart" (TODO fra 2021).
const rom = [
  { id: 'osl-4-orakel', navn: 'Orakelet', kontor: 'Oslo', plasser: 8 },
  { id: 'osl-4-kjelleren', navn: 'Kjelleren', kontor: 'Oslo', plasser: 14 },
  { id: 'brg-2-taarnet', navn: 'Tårnet', kontor: 'Bergen', plasser: 6 },
  { id: 'trd-1-krypten', navn: 'Krypten', kontor: 'Trondheim', plasser: 4 }
]

const bookinger = []

module.exports = { rom, bookinger }
