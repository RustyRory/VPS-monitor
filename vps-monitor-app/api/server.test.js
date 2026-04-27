import { jest } from '@jest/globals';

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
