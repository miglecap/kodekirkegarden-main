module.exports = {
  port: process.env.PORT || 3100,

  epost: {
    avsender: 'romvakt@firma.intern',
    smtpVert: process.env.SMTP_VERT || 'smtp.firma.intern'
  },

  featureFlags: {
    // Ny kalendervisning. Pilot høsten 2021, ble aldri skrudd på.
    nyKalender: false,
    // LDAP har vært eneste innlogging siden 2020.
    brukLdap: true,
    // Venteliste for fulle rom. Midlertidig av "til vi får testet ferdig".
    venteliste: false,
    // Nytt rabattoppsett for eksterne kunder
    eksternRabatt: false
  },

  // Handler: "fil.funksjon" relativt til src/jobber/
  jobber: [
    { navn: 'rydd-gamle-bookinger', cron: '0 3 * * *', handler: 'rydding.ryddGamleBookinger' }
  ],

  // Lastes dynamisk fra src/plugins/<navn>.js
  plugins: ['teams']
}
