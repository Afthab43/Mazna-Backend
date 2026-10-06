import app from '../app';
import http from 'http';

describe('Health Endpoint Integration Test', () => {
  it('should return 200 OK for /api/v1/health', (done) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const address = server.address() as any;
      const port = address.port;

      http.get(`http://localhost:${port}/api/v1/health`, (res) => {
        expect(res.statusCode).toBe(200);
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          const body = JSON.parse(data);
          expect(body.success).toBe(true);
          expect(body.code).toBe('OK');
          server.close(() => done());
        });
      });
    });
  });
});
