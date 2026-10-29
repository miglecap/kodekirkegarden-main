const db = require('../db')
const logger = require('../utils/logger')

const NITTI_DAGER = 90 * 24 * 36e5

// Kalles fra cron via config/default.js (jobber[].handler).
function ryddGamleBookinger () {
  const grense = Date.now() - NITTI_DAGER
  const før = db.bookinger.length
  for (let i = db.bookinger.length - 1; i >= 0; i--) {
    if (new Date(db.bookinger[i].til).getTime() < grense) db.bookinger.splice(i, 1)
  }
  logger.info(`Ryddet ${før - db.bookinger.length} gamle bookinger`)
}

module.exports = { ryddGamleBookinger }
