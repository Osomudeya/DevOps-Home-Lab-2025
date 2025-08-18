const request = require('supertest');
const app = require('../server');
const { pool } = require('../models/database');

describe('Health Endpoint', () => {
  // Close database connections after all tests
  afterAll(async () => {
    await pool.end();
  });

  test('should return healthy status', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(response.body).toMatchObject({
      status: 'healthy',
      services: {
        database: 'healthy',
        redis: 'healthy',
        api: 'healthy',
      },
    });
  });

  test('should return version information', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(response.body.version).toBeDefined();
    expect(response.body.timestamp).toBeDefined();
  });
});
