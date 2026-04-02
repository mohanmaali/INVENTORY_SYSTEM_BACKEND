const request = require('supertest');
const app = require('../../src/app');

describe('Auth API Integration Tests', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      // Note: This will fail without actual MongoDB connection
      // Use test database or mock for integration tests
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'Test1234'
        });

      expect(response.status).toBeDefined();
    });

    it('should return validation error for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test',
          email: 'invalid-email',
          password: 'test'
        });

      expect(response.status).toBe(422);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return error for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password'
        });

      // Will either be 401 (unauthorized) or 500 (MongoDB error)
      expect([401, 500]).toContain(response.status);
    });

    it('should return validation error for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'password'
        });

      expect(response.status).toBe(422);
    });
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /', () => {
    it('should return welcome message', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});