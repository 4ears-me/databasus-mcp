import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { DatabasusClient } from '../client.js';
import type { DatabaseType, ScheduleType, CreateDatabaseDto, UpdateDatabaseDto } from '../types.js';

const databaseTypeSchema = z.enum(['postgres', 'mysql', 'mariadb', 'mongodb']);
const scheduleTypeSchema = z.enum(['hourly', 'daily', 'weekly', 'monthly', 'cron']);

export function registerDatabaseTools(server: McpServer, client: DatabasusClient): void {
  server.tool(
    'databasus_list_databases',
    'List all configured databases',
    {},
    async () => {
      try {
        const databases = await client.getDatabases();
        const result = databases.map(db => ({
          id: db.id,
          name: db.name,
          type: db.type,
          host: db.host,
          status: db.enabled ? 'enabled' : 'disabled',
          lastBackup: db.lastBackupAt ?? null,
          lastBackupStatus: db.lastBackupStatus ?? null,
        }));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        console.error('Error listing databases:', error);
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }) }],
        };
      }
    }
  );

  server.tool(
    'databasus_get_database',
    'Get details of a specific database',
    {
      id: z.string().describe('Database ID'),
    },
    async ({ id }) => {
      try {
        const database = await client.getDatabase(id);
        return {
          content: [{ type: 'text', text: JSON.stringify(database, null, 2) }],
        };
      } catch (error) {
        console.error('Error getting database:', error);
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }) }],
        };
      }
    }
  );

  server.tool(
    'databasus_create_database',
    'Create a new database backup configuration',
    {
      name: z.string().describe('Database name'),
      type: databaseTypeSchema.describe('Database type'),
      host: z.string().describe('Database host'),
      port: z.number().describe('Database port'),
      databaseName: z.string().describe('Database name to backup'),
      username: z.string().describe('Database username'),
      password: z.string().describe('Database password'),
      sslMode: z.string().optional().default('disable').describe('SSL mode'),
      scheduleType: scheduleTypeSchema.describe('Backup schedule type'),
      scheduleValue: z.string().describe('Schedule value (e.g., "02:00" for daily at 2 AM)'),
      retentionDays: z.number().optional().default(30).describe('Backup retention in days'),
      storageId: z.string().describe('Storage destination ID'),
      notifierIds: z.array(z.string()).optional().describe('Notifier IDs for alerts'),
      healthCheckEnabled: z.boolean().optional().default(true).describe('Enable health checks'),
      healthCheckIntervalMinutes: z.number().optional().default(5).describe('Health check interval in minutes'),
    },
    async (params) => {
      try {
        const dto: CreateDatabaseDto = {
          name: params.name,
          type: params.type as DatabaseType,
          host: params.host,
          port: params.port,
          databaseName: params.databaseName,
          username: params.username,
          password: params.password,
          sslMode: params.sslMode,
          scheduleType: params.scheduleType as ScheduleType,
          scheduleValue: params.scheduleValue,
          retentionDays: params.retentionDays,
          storageId: params.storageId,
          notifierIds: params.notifierIds,
          healthCheckEnabled: params.healthCheckEnabled,
          healthCheckIntervalMinutes: params.healthCheckIntervalMinutes,
        };
        const database = await client.createDatabase(dto);
        return {
          content: [{ type: 'text', text: JSON.stringify(database, null, 2) }],
        };
      } catch (error) {
        console.error('Error creating database:', error);
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }) }],
        };
      }
    }
  );

  server.tool(
    'databasus_update_database',
    'Update an existing database configuration',
    {
      id: z.string().describe('Database ID'),
      name: z.string().optional().describe('Database name'),
      host: z.string().optional().describe('Database host'),
      port: z.number().optional().describe('Database port'),
      databaseName: z.string().optional().describe('Database name to backup'),
      username: z.string().optional().describe('Database username'),
      password: z.string().optional().describe('Database password'),
      sslMode: z.string().optional().describe('SSL mode'),
      scheduleType: scheduleTypeSchema.optional().describe('Backup schedule type'),
      scheduleValue: z.string().optional().describe('Schedule value'),
      retentionDays: z.number().optional().describe('Backup retention in days'),
      enabled: z.boolean().optional().describe('Enable or disable the database'),
      storageId: z.string().optional().describe('Storage destination ID'),
      notifierIds: z.array(z.string()).optional().describe('Notifier IDs for alerts'),
      healthCheckEnabled: z.boolean().optional().describe('Enable health checks'),
      healthCheckIntervalMinutes: z.number().optional().describe('Health check interval in minutes'),
    },
    async ({ id, ...params }) => {
      try {
        const dto: UpdateDatabaseDto = {
          name: params.name,
          host: params.host,
          port: params.port,
          databaseName: params.databaseName,
          username: params.username,
          password: params.password,
          sslMode: params.sslMode,
          scheduleType: params.scheduleType as ScheduleType | undefined,
          scheduleValue: params.scheduleValue,
          retentionDays: params.retentionDays,
          enabled: params.enabled,
          storageId: params.storageId,
          notifierIds: params.notifierIds,
          healthCheckEnabled: params.healthCheckEnabled,
          healthCheckIntervalMinutes: params.healthCheckIntervalMinutes,
        };
        const database = await client.updateDatabase(id, dto);
        return {
          content: [{ type: 'text', text: JSON.stringify(database, null, 2) }],
        };
      } catch (error) {
        console.error('Error updating database:', error);
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }) }],
        };
      }
    }
  );

  server.tool(
    'databasus_delete_database',
    'Delete a database configuration',
    {
      id: z.string().describe('Database ID'),
    },
    async ({ id }) => {
      try {
        await client.deleteDatabase(id);
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, message: `Database ${id} deleted successfully` }) }],
        };
      } catch (error) {
        console.error('Error deleting database:', error);
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }) }],
        };
      }
    }
  );

  server.tool(
    'databasus_trigger_backup',
    'Manually trigger a backup for a database',
    {
      id: z.string().describe('Database ID'),
    },
    async ({ id }) => {
      try {
        const backup = await client.triggerBackup(id);
        return {
          content: [{ type: 'text', text: JSON.stringify(backup, null, 2) }],
        };
      } catch (error) {
        console.error('Error triggering backup:', error);
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }) }],
        };
      }
    }
  );

  server.tool(
    'databasus_toggle_database',
    'Enable or disable a database',
    {
      id: z.string().describe('Database ID'),
      enabled: z.boolean().describe('Enable or disable the database'),
    },
    async ({ id, enabled }) => {
      try {
        const database = await client.updateDatabase(id, { enabled });
        return {
          content: [{ type: 'text', text: JSON.stringify(database, null, 2) }],
        };
      } catch (error) {
        console.error('Error toggling database:', error);
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }) }],
        };
      }
    }
  );
}