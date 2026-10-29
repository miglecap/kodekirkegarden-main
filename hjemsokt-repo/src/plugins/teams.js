const logger = require('../utils/logger')

const WEBHOOK = process.env.TEAMS_WEBHOOK

module.exports = {
  async init () {
    if (!WEBHOOK) logger.warn('TEAMS_WEBHOOK mangler, Teams-varsler er av')
  },

  async varsle (tekst) {
    if (!WEBHOOK) return
    await fetch(WEBHOOK, { method: 'POST', body: JSON.stringify({ text: tekst }) })
  }
}
