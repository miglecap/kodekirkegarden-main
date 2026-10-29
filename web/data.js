// Data for the walkthrough. Repo files, packages and tool-call sizes come from
// hjemsokt-repo/ and from real runs of the agent. Replies from finance and the
// product owner, the PR and the test results are illustrative.
window.KK = window.KK || {};

KK.files = [
  { dir: '', files: ['package.json', '.eslintrc.json', 'README.md'] },
  { dir: 'config/', files: ['default.js'] },
  { dir: 'src/', files: ['server.js', 'db.js'] },
  { dir: 'src/middleware/', files: ['auth.js'] },
  { dir: 'src/kalender/', files: ['nyKalender.js'] },
  { dir: 'src/plugins/', files: ['index.js', 'teams.js'] },
  { dir: 'src/utils/', files: ['logger.js', 'legacyCsv.js', 'dato.js'] },
  { dir: 'src/jobber/', files: ['index.js', 'rydding.js'] },
  { dir: 'src/routes/', files: ['rom.js', 'bookinger.js'] },
  { dir: 'src/services/', files: ['bookingService.js', 'varsling.js'] },
  { dir: 'test/', files: ['rom.test.js', 'bookingService.test.js', 'varsling.test.js'] },
];

// use: used | scripts | dead | orphan
KK.packages = [
  { n: 'dayjs', where: 'kalender, utils/dato', use: 'used' },
  { n: 'express', where: 'server, routes', use: 'used' },
  { n: 'lodash', where: 'only in a comment', use: 'dead' },
  { n: 'moment', where: 'only utils/legacyCsv.js', use: 'orphan' },
  { n: 'node-cron', where: 'jobber/index', use: 'used' },
  { n: 'nodemailer', where: 'varsling, test', use: 'used' },
  { n: 'request', where: 'only in a comment', use: 'dead' },
  { n: 'uuid', where: 'bookingService', use: 'used' },
  { n: 'eslint', where: 'npm run lint', use: 'scripts' },
  { n: 'eslint-config-standard', where: '.eslintrc.json', use: 'used' },
  { n: 'jest', where: 'npm test', use: 'scripts' },
  { n: 'nodemon', where: 'npm run dev', use: 'scripts' },
  { n: 'rimraf', where: 'npm run clean', use: 'scripts' },
  { n: 'sinon', where: 'not referenced anywhere', use: 'dead' },
  { n: 'supertest', where: 'test/rom.test.js', use: 'used' },
];

KK.useLabel = {
  used: 'in use',
  scripts: 'npm scripts only',
  dead: 'UBRUKT',
  orphan: 'dies with legacyCsv.js',
};

KK.cards = [
  { id: 'lodash', col: 'safe', t: 'lodash', d: 'Only in a commented-out require' },
  { id: 'request', col: 'safe', t: 'request', d: 'Only in commented-out SMS code. Deprecated.' },
  { id: 'sinon', col: 'safe', t: 'sinon', d: 'No test imports it' },
  { id: 'v1', col: 'safe', t: 'v1 routes', d: 'Commented out in server.js since 2021' },
  { id: 'comments', col: 'safe', t: 'Commented-out blocks', d: 'formaterDatoGammel, sendSms, grupperPerKontor' },
  { id: 'helligdag', col: 'safe', t: 'erHelligdag', d: 'Hardcoded for 2021, never called' },

  { id: 'legacyCsv', col: 'unsure', t: 'legacyCsv.js', d: 'TODO says: ask finance before deleting' },
  { id: 'nyKalender', col: 'unsure', t: 'nyKalender', d: 'Flag off since 2021, but the route is still wired' },
  { id: 'rabatt', col: 'unsure', t: 'eksternRabatt', d: 'Contract was never signed' },

  { id: 'lonn', col: 'keep', t: 'formaterBookingForLonn', d: 'Used by the lonn-integrasjon repo' },
  { id: 'rydding', col: 'keep', t: 'ryddGamleBookinger', d: 'Loaded from a config string, runs nightly' },
  { id: 'teams', col: 'keep', t: 'plugins/teams.js', d: 'Loaded by dynamic import()' },
  { id: 'devtools', col: 'keep', t: 'rimraf · nodemon', d: 'Used by npm scripts' },
];

KK.diffBase = [
  { f: 'package.json' },
  { rm: '  "lodash": "^4.17.21",' },
  { rm: '  "request": "^2.88.2",' },
  { rm: '  "sinon": "^9.2.4",' },
  { f: 'src/server.js' },
  { rm: "  // app.use('/api/v1/bookinger', require('./routes/bookingerV1'))" },
  { rm: "  // app.use('/api/v1/rom', require('./routes/romV1'))" },
  { f: 'src/services/bookingService.js · varsling.js · utils/dato.js' },
  { rm: '  // commented-out grupperPerKontor, sendSms, formaterDatoGammel' },
];

KK.diffFinance = [
  { f: 'src/utils/legacyCsv.js' },
  { rm: '  (file deleted, 20 lines)' },
  { f: 'package.json' },
  { rm: '  "moment": "^2.29.1",' },
];
