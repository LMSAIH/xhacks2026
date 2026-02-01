import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools/index.js';

const server = new Server(
  {
    name: 'learnlm-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

registerTools(server);

const transport = new StdioServerTransport();

server.connect(transport).then(() => {
  console.log('LearnLM MCP Server started');
}).catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  process.exit(0);
});
