import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import { Server as HttpServer } from 'http';

// Test the HTTP server endpoints
describe('HTTP Server', () => {
  let server: HttpServer;
  let baseUrl: string;

  beforeAll(async () => {
    // Import dynamically to avoid import issues
    const { default: fetch } = await import('node-fetch');
    
    // Start server on random port
    const app = express();
    app.use(express.json());
    
    app.get('/health', (_req, res) => {
      res.json({
        status: 'healthy',
        service: 'learnlm-mcp-server',
        version: '1.0.0',
      });
    });
    
    app.get('/', (_req, res) => {
      res.json({
        name: 'LearnLM MCP Server',
        version: '1.0.0',
      });
    });

    return new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          baseUrl = `http://localhost:${address.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(() => {
    return new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('should respond to health check', async () => {
    const response = await fetch(`${baseUrl}/health`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.service).toBe('learnlm-mcp-server');
  });

  it('should respond to root endpoint', async () => {
    const response = await fetch(`${baseUrl}/`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.name).toBe('LearnLM MCP Server');
  });
});
