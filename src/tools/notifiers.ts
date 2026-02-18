import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { DatabasusClient } from '../client.js';
import type { Notifier, NotifierType } from '../types.js';

function maskSensitiveConfig(config: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['url', 'webhook_url', 'webhookUrl', 'token', 'api_key', 'apiKey', 'password', 'secret', 'bot_token', 'botToken', 'access_token', 'accessToken'];
  const masked: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(config)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(sk => lowerKey.includes(sk));

    if (isSensitive && typeof value === 'string') {
      masked[key] = '***REDACTED***';
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

export function registerNotifierTools(server: McpServer, client: DatabasusClient): void {
  server.tool(
    'databasus_list_notifiers',
    'List all notifiers',
    {},
    async () => {
      try {
        const notifiers = await client.getNotifiers();
        const result = notifiers.map((n: Notifier) => ({
          id: n.id,
          name: n.name,
          type: n.type,
          enabled: n.enabled,
        }));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        console.error('Error listing notifiers:', error);
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }) }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'databasus_get_notifier',
    'Get details of a specific notifier',
    {
      id: z.string().describe('The notifier ID'),
    },
    async ({ id }) => {
      try {
        const notifier = await client.getNotifier(id);
        const maskedConfig = maskSensitiveConfig(notifier.config);
        return {
          content: [{ type: 'text', text: JSON.stringify({ ...notifier, config: maskedConfig }, null, 2) }],
        };
      } catch (error) {
        console.error('Error getting notifier:', error);
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }) }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'databasus_create_notifier',
    'Create a new notifier',
    {
      name: z.string().describe('The notifier name'),
      type: z.enum(['email', 'slack', 'discord', 'telegram', 'webhook']).describe('The notifier type'),
      config: z.object({}).passthrough().describe('Notifier-specific configuration'),
    },
    async ({ name, type, config }) => {
      try {
        const notifier = await client.createNotifier({
          name,
          type: type as NotifierType,
          config,
        });
        const maskedConfig = maskSensitiveConfig(notifier.config);
        return {
          content: [{ type: 'text', text: JSON.stringify({ ...notifier, config: maskedConfig }, null, 2) }],
        };
      } catch (error) {
        console.error('Error creating notifier:', error);
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }) }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'databasus_update_notifier',
    'Update an existing notifier',
    {
      id: z.string().describe('The notifier ID'),
      name: z.string().optional().describe('The notifier name'),
      enabled: z.boolean().optional().describe('Whether the notifier is enabled'),
      config: z.object({}).passthrough().optional().describe('Notifier-specific configuration'),
    },
    async ({ id, name, enabled, config }) => {
      try {
        const notifier = await client.updateNotifier(id, {
          name,
          enabled,
          config,
        });
        const maskedConfig = maskSensitiveConfig(notifier.config);
        return {
          content: [{ type: 'text', text: JSON.stringify({ ...notifier, config: maskedConfig }, null, 2) }],
        };
      } catch (error) {
        console.error('Error updating notifier:', error);
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }) }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'databasus_delete_notifier',
    'Delete a notifier',
    {
      id: z.string().describe('The notifier ID'),
    },
    async ({ id }) => {
      try {
        await client.deleteNotifier(id);
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, message: `Notifier ${id} deleted successfully` }) }],
        };
      } catch (error) {
        console.error('Error deleting notifier:', error);
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }) }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'databasus_test_notifier',
    'Test notifier by sending a test notification',
    {
      id: z.string().describe('The notifier ID'),
    },
    async ({ id }) => {
      try {
        const result = await client.testNotifier(id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        console.error('Error testing notifier:', error);
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }) }],
          isError: true,
        };
      }
    }
  );
}
