const request = require('supertest');

jest.mock('./services/docker', () => ({
  getContainers: jest.fn().mockResolvedValue([
    { name: 'app1', status: 'running', image: 'img', ports: ['3000'], uptime: 'Up 1 hour' },
  ]),
}));

jest.mock('./services/http', () => ({
  checkWebsites: jest.fn().mockResolvedValue([
    { name: 'SaintBarth Volley', url: '/saintbarthvolley/', httpCode: 200, status: 'OK' },
  ]),
}));

const app = require('./server');

describe('GET /api/status', () => {
  it('répond 200 avec la structure attendue', async () => {
    const res = await request(app).get('/api/status');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('containers');
    expect(res.body).toHaveProperty('websites');
    expect(res.body).toHaveProperty('globalStatus');
  });

  it('globalStatus est OK si tous les containers tournent', async () => {
    const res = await request(app).get('/api/status');
    expect(res.body.globalStatus).toBe('OK');
  });
});
