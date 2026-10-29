const dayjs = require('dayjs')

function overlapper (a, b) {
  return new Date(a.fra) < new Date(b.til) && new Date(b.fra) < new Date(a.til)
}

function formaterDato (iso) {
  return dayjs(iso).format('DD.MM.YYYY HH:mm')
}

// Hardkodet for 2021. Skulle hentes fra et API.
const HELLIGDAGER_2021 = ['2021-01-01', '2021-04-01', '2021-04-02', '2021-04-05', '2021-05-17', '2021-12-25']

function erHelligdag (iso) {
  return HELLIGDAGER_2021.includes(dayjs(iso).format('YYYY-MM-DD'))
}

// function formaterDatoGammel (iso) {
//   return moment(iso).locale('nb').format('LLL')
// }

module.exports = { overlapper, formaterDato }
