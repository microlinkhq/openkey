import request from 'supertest';
import { server } from '../index';
import { gateway } from '../gateway';

afterAll(async () => {
  server.close();
});

describe('Rate limiting middleware', () => {
  beforeAll(async () => {
    await gateway.plans.create({
      id: 'test-plan',
      name: 'Test Plan',
      limit: '5',
      ttl: '60',
    });

    await gateway.key.create({
      planId: 'test-plan',
      id: 'test-key',
      key: 'test-api-key',
      name: 'Test API Key',
    });
  });

  afterAll(async () => {
    await gateway.plans.del('test-plan');
    await gateway.key.del('test-api-key');
  });

  test('Valid API key should return success', async () => {
    const response = await request(server)
      .get('/')
      .set('x-api-key', 'test-api-key');

    expect(response.status).toBe(200);
    expect(response.text).toBe('Microlink seal of approval');
  });

  test('Invalid API key should return unauthorized', async () => {
    const response = await request(server)
      .get('/')
      .set('x-api-key', '');

    expect(response.status).toBe(401);
    expect(response.text).toBe('Unauthorized');
  });

  test('Exceeding rate limit should return rate limit exceeded', async () => {
    for (let i = 0; i < 5; i++) {
      await request(server)
        .get('/')
        .set('x-api-key', 'test-api-key');
    }

    const response = await request(server)
      .get('/')
      .set('x-api-key', 'test-api-key');

    expect(response.status).toBe(429);
    expect(response.text).toBe('Rate limit exceeded');
  });
});
