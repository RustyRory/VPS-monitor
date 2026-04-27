import { jest } from '@jest/globals';

// Définis avant l'import pour que dotenv ne les écrase pas
process.env.AUTH_USER = 'admin';
process.env.AUTH_PASS = 'testpass';
process.env.SESSION_SECRET = 'test-secret';

jest.unstable_mockModule('./services/docker.js', () => ({
  getContainers: jest.fn().mockResolvedValue([
    { name: 'app1', status: 'running', image: 'img', ports: ['3000'], uptime: 'Up 1 hour' },
  ]),
  restartContainer: jest.fn().mockResolvedValue(),
  stopContainer: jest.fn().mockResolvedValue(),
  startContainer: jest.fn().mockResolvedValue(),
}));

jest.unstable_mockModule('./services/http.js', () => ({
  checkWebsites: jest.fn().mockResolvedValue([
    { name: 'SaintBarth Volley', url: '/saintbarthvolley/', httpCode: 200, status: 'OK' },
  ]),
}));

const { default: app } = await import('./server.js');
const { default: request } = await import('supertest');

const CREDENTIALS = { username: 'admin', password: 'testpass' };

describe('Auth', () => {
  it('refuse sans session', async () => {
    const res = await request(app).get('/api/status');
    expect(res.statusCode).toBe(401);
  });

  it('refuse avec mauvais identifiants', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'admin', password: 'wrong' });
    expect(res.statusCode).toBe(401);
  });

  it('accepte avec les bons identifiants', async () => {
    const res = await request(app).post('/auth/login').send(CREDENTIALS);
    expect(res.statusCode).toBe(200);
  });
});

describe('GET /api/status', () => {
  let agent;

  beforeEach(async () => {
    agent = request.agent(app);
    await agent.post('/auth/login').send(CREDENTIALS);
  });

  it('répond 200 avec la structure attendue', async () => {
    const res = await agent.get('/api/status');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('containers');
    expect(res.body).toHaveProperty('websites');
    expect(res.body).toHaveProperty('globalStatus');
  });

  it('globalStatus est OK si tous les containers tournent', async () => {
    const res = await agent.get('/api/status');
    expect(res.body.globalStatus).toBe('OK');
  });
});
