import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { DatabasusClient } from '../client.js';

export function registerWorkspaceTools(server: McpServer, client: DatabasusClient): void {
  server.tool(
    'databasus_list_workspaces',
    'List all workspaces',
    {},
    async () => {
      try {
        const workspaces = await client.getWorkspaces();
        const result = workspaces.map(w => ({
          id: w.id,
          name: w.name,
          description: w.description,
          memberCount: w.memberCount,
          databaseCount: w.databaseCount,
        }));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        console.error('Error listing workspaces:', error);
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }) }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'databasus_get_workspace',
    'Get details of a specific workspace',
    {
      id: z.string().describe('Workspace ID'),
    },
    async ({ id }) => {
      try {
        const workspace = await client.getWorkspace(id);
        return {
          content: [{ type: 'text', text: JSON.stringify(workspace, null, 2) }],
        };
      } catch (error) {
        console.error('Error getting workspace:', error);
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }) }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'databasus_get_health_checks',
    'Get health check history for a database',
    {
      databaseId: z.string().describe('Database ID'),
      limit: z.number().optional().default(10).describe('Maximum number of results to return'),
    },
    async ({ databaseId, limit }) => {
      try {
        const healthChecks = await client.getHealthChecks(databaseId);
        const result = healthChecks.slice(0, limit).map(hc => ({
          id: hc.id,
          status: hc.status,
          responseTimeMs: hc.responseTimeMs,
          checkedAt: hc.checkedAt,
          errorMessage: hc.errorMessage,
        }));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        console.error('Error getting health checks:', error);
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }) }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'databasus_get_latest_health',
    'Get latest health status for a database',
    {
      databaseId: z.string().describe('Database ID'),
    },
    async ({ databaseId }) => {
      try {
        const healthCheck = await client.getLatestHealthCheck(databaseId);
        return {
          content: [{ type: 'text', text: JSON.stringify({
            id: healthCheck.id,
            status: healthCheck.status,
            responseTimeMs: healthCheck.responseTimeMs,
            checkedAt: healthCheck.checkedAt,
            errorMessage: healthCheck.errorMessage,
          }, null, 2) }],
        };
      } catch (error) {
        console.error('Error getting latest health check:', error);
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }) }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'databasus_get_stats',
    'Get overall statistics',
    {},
    async () => {
      try {
        const stats = await client.getStats();
        return {
          content: [{ type: 'text', text: JSON.stringify({
            totalDatabases: stats.totalDatabases,
            healthyDatabases: stats.healthyDatabases,
            unhealthyDatabases: stats.unhealthyDatabases,
            totalBackups: stats.totalBackups,
            totalSize: stats.totalSize,
            lastBackupAt: stats.lastBackupAt,
          }, null, 2) }],
        };
      } catch (error) {
        console.error('Error getting stats:', error);
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }) }],
          isError: true,
        };
      }
    }
  );
}
