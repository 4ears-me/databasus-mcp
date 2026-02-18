import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { DatabasusClient } from '../client.js';
import type { Backup } from '../types.js';

export function registerBackupTools(server: McpServer, client: DatabasusClient): void {
  server.tool(
    'databasus_list_backups',
    'List all backups, optionally filtered by database',
    {
      databaseId: z.string().optional().describe('Filter backups by database ID'),
    },
    async ({ databaseId }) => {
      try {
        const backups = await client.getBackups(databaseId);
        const result = backups.map((backup: Backup) => ({
          id: backup.id,
          databaseId: backup.databaseId,
          status: backup.status,
          size: backup.size,
          startedAt: backup.startedAt,
          completedAt: backup.completedAt,
        }));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        console.error('Error listing backups:', error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: error instanceof Error ? error.message : 'Failed to list backups',
              }),
            },
          ],
        };
      }
    }
  );

  server.tool(
    'databasus_get_backup',
    'Get details of a specific backup',
    {
      id: z.string().describe('Backup ID'),
    },
    async ({ id }) => {
      try {
        const backup = await client.getBackup(id);
        return {
          content: [{ type: 'text', text: JSON.stringify(backup, null, 2) }],
        };
      } catch (error) {
        console.error('Error getting backup:', error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: error instanceof Error ? error.message : 'Failed to get backup',
              }),
            },
          ],
        };
      }
    }
  );

  server.tool(
    'databasus_download_backup',
    'Get download information for a backup',
    {
      id: z.string().describe('Backup ID'),
    },
    async ({ id }) => {
      try {
        const downloadInfo = await client.downloadBackup(id);
        return {
          content: [{ type: 'text', text: JSON.stringify(downloadInfo, null, 2) }],
        };
      } catch (error) {
        console.error('Error downloading backup:', error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: error instanceof Error ? error.message : 'Failed to get download info for backup',
              }),
            },
          ],
        };
      }
    }
  );

  server.tool(
    'databasus_delete_backup',
    'Delete a backup',
    {
      id: z.string().describe('Backup ID'),
    },
    async ({ id }) => {
      try {
        await client.deleteBackup(id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: `Backup ${id} deleted successfully` }),
            },
          ],
        };
      } catch (error) {
        console.error('Error deleting backup:', error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: error instanceof Error ? error.message : 'Failed to delete backup',
              }),
            },
          ],
        };
      }
    }
  );

  server.tool(
    'databasus_get_backup_stats',
    'Get backup statistics for a database or overall',
    {
      databaseId: z.string().optional().describe('Filter by database ID, or omit for overall stats'),
    },
    async ({ databaseId }) => {
      try {
        const backups = await client.getBackups(databaseId);
        const completedBackups = backups.filter((b: Backup) => b.status === 'completed');
        const failedBackups = backups.filter((b: Backup) => b.status === 'failed');
        const runningBackups = backups.filter((b: Backup) => b.status === 'running');
        const pendingBackups = backups.filter((b: Backup) => b.status === 'pending');

        const totalSize = completedBackups.reduce((sum: number, b: Backup) => sum + b.size, 0);

        const lastBackup = completedBackups.length > 0
          ? completedBackups.reduce((latest: Backup, b: Backup) =>
              new Date(b.completedAt!) > new Date(latest.completedAt!) ? b : latest
            )
          : null;

        const stats = {
          totalBackups: backups.length,
          completedBackups: completedBackups.length,
          failedBackups: failedBackups.length,
          runningBackups: runningBackups.length,
          pendingBackups: pendingBackups.length,
          totalSize,
          totalSizeFormatted: formatBytes(totalSize),
          lastBackupAt: lastBackup?.completedAt || null,
          lastBackupId: lastBackup?.id || null,
          databaseId: databaseId || null,
        };

        return {
          content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }],
        };
      } catch (error) {
        console.error('Error getting backup stats:', error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: error instanceof Error ? error.message : 'Failed to get backup statistics',
              }),
            },
          ],
        };
      }
    }
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
