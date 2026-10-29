const logger = require('../utils/logger')

// Plugins lastes etter navn fra config.plugins. Fila må hete src/plugins/<navn>.js
async function lastPlugins (navnListe = []) {
  for (const navn of navnListe) {
    const plugin = await import(`./${navn}.js`)
    await plugin.default.init()
    logger.info(`Plugin lastet: ${navn}`)
  }
}

module.exports = { lastPlugins }
