const request = require('supertest')
const app = require('../src/server')

describe.skip('GET /api/rom/kalender', () => {
  // Ny kalender er bak flagg. Skippet siden piloten i 2021.
  it('returnerer ukevisning', async () => {
    const res = await request(app).get('/api/rom/kalender').set('x-ldap-bruker', 'kari')
    expect(res.status).toBe(200)
  })
})

describe('GET /helse', () => {
  it('svarer ok', async () => {
    const res = await request(app).get('/helse')
    expect(res.body.status).toBe('ok')
  })
})
