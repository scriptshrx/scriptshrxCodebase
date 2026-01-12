const request = require('supertest');
const app = require('../../app');

describe('GET /api/settings', () => {
    it('should return 401 when no auth token is provided', async () => {
        const response = await request(app).get('/api/settings');
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
    });
});
