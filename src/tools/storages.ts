import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { DatabasusClient } from '../client.js';
import type { Storage, StorageType } from '../types.js';

const SENSITIVE_KEYS = ['password', 'secret', 'key', 'token', 'credential', 'apiKey', 'api_key', 'accessKey', 'access_key', 'secretKey', 'secret_key'];

function maskSensitiveConfig(config: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive));
    if (isSensitive && typeof value === 'string') {
      masked[key] = '***';
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveConfig(value as Record<string, unknown>);
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

function maskStorage(storage: Storage): Record<string, unknown> {
  return {
    id: storage.id,
    name: storage.name,
    type: storage.type,
    enabled: storage.enabled,
    config: maskSensitiveConfig(storage.config),
    createdAt: storage.createdAt,
    updatedAt: storage.updatedAt,
  };
}

function maskStorages(storages: Storage[]): Record<string, unknown>[] {
  return storages.map(storage => ({
    id: storage.id,
    name: storage.name,
    type: storage.type,
    enabled: storage.enabled,
  }));
}

const StorageTypeSchema = z.enum(['local', 's3', 'google_drive', 'dropbox', 'sftp', 'ftp', 'rclone', 'azure_blob', 'gcs'] as [StorageType, ...StorageType[]]);

export function registerStorageTools(server: McpServer, client: DatabasusClient): void {
  server.tool(
    'databasus_list_storages',
    'List all storage destinations',
    {},
    async () => {
      try {
        const storages = await client.getStorages();
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(maskStorages(storages), null, 2),
            },
          ],
        };
      } catch (error) {
        console.error('Error listing storages:', error);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            },
          ],
        };
      }
    }
  );

  server.tool(
    'databasus_get_storage',
    'Get details of a specific storage destination',
    {
      id: z.string().describe('Storage ID'),
    },
    async ({ id }) => {
      try {
        const storage = await client.getStorage(id);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(maskStorage(storage), null, 2),
            },
          ],
        };
      } catch (error) {
        console.error('Error getting storage:', error);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            },
          ],
        };
      }
    }
  );

  server.tool(
    'databasus_create_storage',
    'Create a new storage destination',
    {
      name: z.string().describe('Storage name'),
      type: StorageTypeSchema.describe('Storage type'),
      config: z.record(z.unknown()).describe('Storage-specific configuration'),
    },
    async ({ name, type, config }) => {
      try {
        const storage = await client.createStorage({ name, type, config });
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(maskStorage(storage), null, 2),
            },
          ],
        };
      } catch (error) {
        console.error('Error creating storage:', error);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            },
          ],
        };
      }
    }
  );

  server.tool(
    'databasus_update_storage',
    'Update an existing storage destination',
    {
      id: z.string().describe('Storage ID'),
      name: z.string().optional().describe('Storage name'),
      enabled: z.boolean().optional().describe('Whether storage is enabled'),
      config: z.record(z.unknown()).optional().describe('Storage-specific configuration'),
    },
    async ({ id, name, enabled, config }) => {
      try {
        const storage = await client.updateStorage(id, { name, enabled, config });
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(maskStorage(storage), null, 2),
            },
          ],
        };
      } catch (error) {
        console.error('Error updating storage:', error);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            },
          ],
        };
      }
    }
  );

  server.tool(
    'databasus_delete_storage',
    'Delete a storage destination',
    {
      id: z.string().describe('Storage ID'),
    },
    async ({ id }) => {
      try {
        await client.deleteStorage(id);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ success: true, message: `Storage ${id} deleted successfully` }),
            },
          ],
        };
      } catch (error) {
        console.error('Error deleting storage:', error);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            },
          ],
        };
      }
    }
  );

  server.tool(
    'databasus_test_storage',
    'Test storage connection',
    {
      id: z.string().describe('Storage ID'),
    },
    async ({ id }) => {
      try {
        const result = await client.testStorage(id);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error('Error testing storage:', error);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
            },
          ],
        };
      }
    }
  );
}
