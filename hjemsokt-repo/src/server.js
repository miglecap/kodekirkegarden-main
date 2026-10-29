const express = require('express')
const config = require('../config/default')
const logger = require('./utils/logger')
const { autentiser } = require('./middleware/auth')
const bookingRuter = require('./routes/bookinger')
const romRuter = require('./routes/rom')
const { startJobber } = require('./jobber')
const { lastPlugins } = require('./plugins')

const app = express()
app.use(express.json())
app.get('/helse', (req, res) => res.json({ status: 'ok' }))
app.use(autentiser)

app.use('/api/bookinger', bookingRuter)
app.use('/api/rom', romRuter)

// app.use('/api/v1/bookinger', require('./routes/bookingerV1'))
// app.use('/api/v1/rom', require('./routes/romV1'))
// Gamle v1-ruter. Fjernet når mobilappen gikk over til v2 (mars 2021).

async function start () {
  await lastPlugins(config.plugins)
  startJobber(config.jobber)
  app.listen(config.port, () => logger.info(`Romvakt lytter på ${config.port}`))
}

if (require.main === module) start()

module.exports = app
