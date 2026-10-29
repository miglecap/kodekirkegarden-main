const nodemailer = require('nodemailer')
const config = require('../../config/default')
const logger = require('../utils/logger')
const { formaterDato } = require('../utils/dato')

const transport = nodemailer.createTransport({ host: config.epost.smtpVert, port: 25 })

async function sendBekreftelse (til, booking) {
  await transport.sendMail({
    from: config.epost.avsender,
    to: til,
    subject: `Booket: ${booking.tittel || 'møte'}`,
    text: `Rommet er ditt ${formaterDato(booking.fra)}.`
  })
  logger.info(`Bekreftelse sendt til ${til}`)
}

// TODO (2021-06-02): SMS-varsling når leverandøravtalen er på plass. /Mona
// const request = require('request')
// async function sendSms (nummer, tekst) {
//   return new Promise((resolve, reject) => {
//     request.post('https://sms.leverandor.no/api/send', {
//       json: { til: nummer, melding: tekst, avsender: 'ROMVAKT' }
//     }, (err, res) => (err ? reject(err) : resolve(res.body)))
//   })
// }

async function sendPaaminnelse (til, booking) {
  // TODO (2021-09-20): påminnelse 15 min før. Trenger cron-jobb.
  logger.warn('sendPaaminnelse er ikke implementert')
}

module.exports = { sendBekreftelse, sendPaaminnelse }
