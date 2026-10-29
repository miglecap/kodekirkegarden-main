// Eksport av bookinger til CSV for økonomi. Erstattet av lønnsintegrasjonen.
// TODO (2021-02-15): slett når økonomi bekrefter at de ikke trenger denne. /Mona
const fs = require('fs')
const moment = require('moment')
const db = require('../db')

function eksporterCsv (filsti) {
  const linjer = ['id;rom;fra;til;bruker']
  for (const b of db.bookinger) {
    linjer.push([b.id, b.romId, moment(b.fra).format('DD.MM.YYYY'), moment(b.til).format('DD.MM.YYYY'), b.brukerId].join(';'))
  }
  fs.writeFileSync(filsti, linjer.join('\n'), 'latin1')
}

function lesCsv (filsti) {
  return fs.readFileSync(filsti, 'latin1').split('\n').slice(1).map((l) => l.split(';'))
}

module.exports = { eksporterCsv, lesCsv }
