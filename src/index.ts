#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DatabasusClient } from './client.js';
import { registerDatabaseTools } from './tools/databases.js';
import { registerBackupTools } from './tools/backups.js';
import { registerStorageTools } from './tools/storages.js';
import { registerNotifierTools } from './tools/notifiers.js';
import { registerWorkspaceTools } from './tools/workspaces.js';

const DATABASUS_URL = process.env.DATABASUS_URL;
const DATABASUS_API_KEY = process.env.DATABASUS_API_KEY;
const DATABASUS_BEARER_TOKEN = process.env.DATABASUS_BEARER_TOKEN;

if (!DATABASUS_URL) {
  console.error('Error: DATABASUS_URL environment variable is required');
  console.error('Usage: DATABASUS_URL=https://your-databasus-instance.com databasus-mcp');
  process.exit(1);
}

const client = new DatabasusClient({
  baseUrl: DATABASUS_URL,
  apiKey: DATABASUS_API_KEY,
  bearerToken: DATABASUS_BEARER_TOKEN,
});

const server = new McpServer({
  name: 'databasus-mcp',
  version: '1.0.0',
});

// Register all tools
registerDatabaseTools(server, client);
registerBackupTools(server, client);
registerStorageTools(server, client);
registerNotifierTools(server, client);
registerWorkspaceTools(server, client);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Databasus MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
