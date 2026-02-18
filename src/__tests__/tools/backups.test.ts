import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DatabasusClient } from '../../client.js';
import { Backup } from '../../types.js';
import { registerBackupTools } from '../../tools/backups.js';

vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('Backup Tools', () => {
  let mockServer: McpServer;
  let mockClient: DatabasusClient;
  let registeredTools: Map<string, { schema: unknown; handler: (params: unknown) => Promise<unknown> }>;

  const createMockBackup = (overrides: Partial<Backup> = {}): Backup => ({
    id: 'backup-1',
    databaseId: 'db-1',
    status: 'completed',
    size: 1024000,
    duration: 5000,
    startedAt: '2024-01-01T10:00:00Z',
    completedAt: '2024-01-01T10:01:00Z',
    storagePath: '/backups/backup-1.sql.gz',
    encrypted: true,
    compressed: true,
    ...overrides,
  });

  beforeEach(() => {
    registeredTools = new Map();
    
    mockServer = {
      tool: vi.fn((name: string, _description: string, schema: unknown, handler: (params: unknown) => Promise<unknown>) => {
        registeredTools.set(name, { schema, handler });
      }),
    } as unknown as McpServer;

    mockClient = {
      getBackups: vi.fn(),
      getBackup: vi.fn(),
      downloadBackup: vi.fn(),
      deleteBackup: vi.fn(),
    } as unknown as DatabasusClient;

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('databasus_list_backups', () => {
    it('should register the tool with correct schema', () => {
      registerBackupTools(mockServer, mockClient);
      
      expect(registeredTools.has('databasus_list_backups')).toBe(true);
      const tool = registeredTools.get('databasus_list_backups');
      expect(tool?.schema).toHaveProperty('databaseId');
    });

    it('should list all backups without filter', async () => {
      const backups = [
        createMockBackup({ id: 'backup-1' }),
        createMockBackup({ id: 'backup-2', databaseId: 'db-2' }),
      ];
      vi.mocked(mockClient.getBackups).mockResolvedValue(backups);

      registerBackupTools(mockServer, mockClient);
      const tool = registeredTools.get('databasus_list_backups');
      const result = await tool!.handler({});

      expect(mockClient.getBackups).toHaveBeenCalledWith(undefined);
      const parsedResult = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(parsedResult).toHaveLength(2);
      expect(parsedResult[0]).toEqual({
        id: 'backup-1',
        databaseId: 'db-1',
        status: 'completed',
        size: 1024000,
        startedAt: '2024-01-01T10:00:00Z',
        completedAt: '2024-01-01T10:01:00Z',
      });
    });

    it('should list backups filtered by databaseId', async () => {
      const backups = [createMockBackup({ id: 'backup-1', databaseId: 'db-1' })];
      vi.mocked(mockClient.getBackups).mockResolvedValue(backups);

      registerBackupTools(mockServer, mockClient);
      const tool = registeredTools.get('databasus_list_backups');
      const result = await tool!.handler({ databaseId: 'db-1' });

      expect(mockClient.getBackups).toHaveBeenCalledWith('db-1');
      const parsedResult = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(parsedResult).toHaveLength(1);
      expect(parsedResult[0].databaseId).toBe('db-1');
    });

    it('should return empty array when no backups exist', async () => {
      vi.mocked(mockClient.getBackups).mockResolvedValue([]);

      registerBackupTools(mockServer, mockClient);
      const tool = registeredTools.get('databasus_list_backups');
      const result = await tool!.handler({});

      const parsedResult = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(parsedResult).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(mockClient.getBackups).mockRejectedValue(new Error('Network error'));

      registerBackupTools(mockServer, mockClient);
      const tool = registeredTools.get('databasus_list_backups');
      const result = await tool!.handler({});

      const parsedResult = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(parsedResult).toEqual({ error: 'Network error' });
    });

    it('should handle non-Error errors', async () => {
      vi.mocked(mockClient.getBackups).mockRejectedValue('Unknown failure');

      registerBackupTools(mockServer, mockClient);
      const tool = registeredTools.get('databasus_list_backups');
      const result = await tool!.handler({});

      const parsedResult = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(parsedResult).toEqual({ error: 'Failed to list backups' });
    });
  });

  describe('databasus_get_backup', () => {
    it('should register the tool with correct schema', () => {
      registerBackupTools(mockServer, mockClient);
      
      expect(registeredTools.has('databasus_get_backup')).toBe(true);
      const tool = registeredTools.get('databasus_get_backup');
      expect(tool?.schema).toHaveProperty('id');
    });

    it('should get a specific backup by id', async () => {
      const backup = createMockBackup({ id: 'backup-123' });
      vi.mocked(mockClient.getBackup).mockResolvedValue(backup);

      registerBackupTools(mockServer, mockClient);
      const tool = registeredTools.get('databasus_get_backup');
      const result = await tool!.handler({ id: 'backup-123' });

      expect(mockClient.getBackup).toHaveBeenCalledWith('backup-123');
      const parsedResult = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(parsedResult.id).toBe('backup-123');
      expect(parsedResult.databaseId).toBe('db-1');
      expect(parsedResult.status).toBe('completed');
      expect(parsedResult.size).toBe(1024000);
      expect(parsedResult.duration).toBe(5000);
      expect(parsedResult.encrypted).toBe(true);
      expect(parsedResult.compressed).toBe(true);
    });

    it('should return backup with error field when failed', async () => {
      const backup = createMockBackup({ 
        id: 'backup-failed', 
        status: 'failed',
        error: 'Connection timeout',
        completedAt: undefined,
      });
      vi.mocked(mockClient.getBackup).mockResolvedValue(backup);

      registerBackupTools(mockServer, mockClient);
      const tool = registeredTools.get('databasus_get_backup');
      const result = await tool!.handler({ id: 'backup-failed' });

      const parsedResult = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(parsedResult.status).toBe('failed');
      expect(parsedResult.error).toBe('Connection timeout');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(mockClient.getBackup).mockRejectedValue(new Error('Backup not found'));

      registerBackupTools(mockServer, mockClient);
      const tool = registeredTools.get('databasus_get_backup');
      const result = await tool!.handler({ id: 'nonexistent' });

      const parsedResult = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(parsedResult).toEqual({ error: 'Backup not found' });
    });

    it('should handle non-Error errors', async () => {
      vi.mocked(mockClient.getBackup).mockRejectedValue(null);

      registerBackupTools(mockServer, mockClient);
      const tool = registeredTools.get('databasus_get_backup');
      const result = await tool!.handler({ id: 'backup-1' });

      const parsedResult = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(parsedResult).toEqual({ error: 'Failed to get backup' });
    });
  });

  describe('databasus_download_backup', () => {
    it('should register the tool with correct schema', () => {
      registerBackupTools(mockServer, mockClient);
      
      expect(registeredTools.has('databasus_download_backup')).toBe(true);
      const tool = registeredTools.get('databasus_download_backup');
      expect(tool?.schema).toHaveProperty('id');
    });

    it('should get download URL for a backup', async () => {
      const downloadInfo = { url: 'https://storage.example.com/backups/backup-1.sql.gz?token=abc123' };
      vi.mocked(mockClient.downloadBackup).mockResolvedValue(downloadInfo);

      registerBackupTools(mockServer, mockClient);
      const tool = registeredTools.get('databasus_download_backup');
      const result = await tool!.handler({ id: 'backup-1' });

      expect(mockClient.downloadBackup).toHaveBeenCalledWith('backup-1');
      const parsedResult = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(parsedResult.url).toBe('https://storage.example.com/backups/backup-1.sql.gz?token=abc123');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(mockClient.downloadBackup).mockRejectedValue(new Error('Download not available'));

      registerBackupTools(mockServer, mockClient);
      const tool = registeredTools.get('databasus_download_backup');
      const result = await tool!.handler({ id: 'backup-1' });

      const parsedResult = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(parsedResult).toEqual({ error: 'Download not available' });
    });

    it('should handle non-Error errors', async () => {
      vi.mocked(mockClient.downloadBackup).mockRejectedValue(undefined);

      registerBackupTools(mockServer, mockClient);
      const tool = registeredTools.get('databasus_download_backup');
      const result = await tool!.handler({ id: 'backup-1' });

      const parsedResult = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(parsedResult).toEqual({ error: 'Failed to get download info for backup' });
    });
  });

  describe('databasus_delete_backup', () => {
    it('should register the tool with correct schema', () => {
      registerBackupTools(mockServer, mockClient);
      
      expect(registeredTools.has('databasus_delete_backup')).toBe(true);
      const tool = registeredTools.get('databasus_delete_backup');
      expect(tool?.schema).toHaveProperty('id');
    });

    it('should delete a backup successfully', async () => {
      vi.mocked(mockClient.deleteBackup).mockResolvedValue(undefined);

      registerBackupTools(mockServer, mockClient);
      const tool = registeredTools.get('databasus_delete_backup');
      const result = await tool!.handler({ id: 'backup-to-delete' });

      expect(mockClient.deleteBackup).toHaveBeenCalledWith('backup-to-delete');
      const parsedResult = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(parsedResult).toEqual({ 
        success: true, 
        message: 'Backup backup-to-delete deleted successfully' 
      });
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(mockClient.deleteBackup).mockRejectedValue(new Error('Cannot delete backup'));

      registerBackupTools(mockServer, mockClient);
      const tool = registeredTools.get('databasus_delete_backup');
      const result = await tool!.handler({ id: 'backup-1' });

      const parsedResult = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(parsedResult).toEqual({ error: 'Cannot delete backup' });
    });

    it('should handle non-Error errors', async () => {
      vi.mocked(mockClient.deleteBackup).mockRejectedValue({ reason: 'unknown' });

      registerBackupTools(mockServer, mockClient);
      const tool = registeredTools.get('databasus_delete_backup');
      const result = await tool!.handler({ id: 'backup-1' });

      const parsedResult = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(parsedResult).toEqual({ error: 'Failed to delete backup' });
    });
  });

  describe('databasus_get_backup_stats', () => {
    it('should register the tool with correct schema', () => {
      registerBackupTools(mockServer, mockClient);
      
      expect(registeredTools.has('databasus_get_backup_stats')).toBe(true);
      const tool = registeredTools.get('databasus_get_backup_stats');
      expect(tool?.schema).toHaveProperty('databaseId');
    });

    it('should calculate stats for all backups', async () => {
      const backups: Backup[] = [
        createMockBackup({ id: 'b1', status: 'completed', size: 1000, completedAt: '2024-01-01T10:00:00Z' }),
        createMockBackup({ id: 'b2', status: 'completed', size: 2000, completedAt: '2024-01-02T10:00:00Z' }),
        createMockBackup({ id: 'b3', status: 'failed', size: 0 }),
        createMockBackup({ id: 'b4', status: 'running', size: 500 }),
        createMockBackup({ id: 'b5', status: 'pending', size: 0 }),
      ];
      vi.mocked(mockClient.getBackups).mockResolvedValue(backups);

      registerBackupTools(mockServer, mockClient);
      const tool = registeredTools.get('databasus_get_backup_stats');
      const result = await tool!.handler({});

      expect(mockClient.getBackups).toHaveBeenCalledWith(undefined);
      const parsedResult = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      
      expect(parsedResult.totalBackups).toBe(5);
      expect(parsedResult.completedBackups).toBe(2);
      expect(parsedResult.failedBackups).toBe(1);
      expect(parsedResult.runningBackups).toBe(1);
      expect(parsedResult.pendingBackups).toBe(1);
      expect(parsedResult.totalSize).toBe(3000);
      expect(parsedResult.totalSizeFormatted).toBe('2.93 KB');
      expect(parsedResult.lastBackupAt).toBe('2024-01-02T10:00:00Z');
      expect(parsedResult.lastBackupId).toBe('b2');
      expect(parsedResult.databaseId).toBeNull();
    });

    it('should calculate stats filtered by databaseId', async () => {
      const backups: Backup[] = [
        createMockBackup({ id: 'b1', databaseId: 'db-1', status: 'completed', size: 5000, completedAt: '2024-01-03T10:00:00Z' }),
      ];
      vi.mocked(mockClient.getBackups).mockResolvedValue(backups);

      registerBackupTools(mockServer, mockClient);
      const tool = registeredTools.get('databasus_get_backup_stats');
      const result = await tool!.handler({ databaseId: 'db-1' });

      expect(mockClient.getBackups).toHaveBeenCalledWith('db-1');
      const parsedResult = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      
      expect(parsedResult.totalBackups).toBe(1);
      expect(parsedResult.completedBackups).toBe(1);
      expect(parsedResult.failedBackups).toBe(0);
      expect(parsedResult.runningBackups).toBe(0);
      expect(parsedResult.pendingBackups).toBe(0);
      expect(parsedResult.totalSize).toBe(5000);
      expect(parsedResult.databaseId).toBe('db-1');
    });

    it('should handle empty backups list', async () => {
      vi.mocked(mockClient.getBackups).mockResolvedValue([]);

      registerBackupTools(mockServer, mockClient);
      const tool = registeredTools.get('databasus_get_backup_stats');
      const result = await tool!.handler({});

      const parsedResult = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      
      expect(parsedResult.totalBackups).toBe(0);
      expect(parsedResult.completedBackups).toBe(0);
      expect(parsedResult.failedBackups).toBe(0);
      expect(parsedResult.runningBackups).toBe(0);
      expect(parsedResult.pendingBackups).toBe(0);
      expect(parsedResult.totalSize).toBe(0);
      expect(parsedResult.totalSizeFormatted).toBe('0 B');
      expect(parsedResult.lastBackupAt).toBeNull();
      expect(parsedResult.lastBackupId).toBeNull();
    });

    it('should find the most recent backup correctly', async () => {
      const backups: Backup[] = [
        createMockBackup({ id: 'old', status: 'completed', size: 1000, completedAt: '2024-01-01T10:00:00Z' }),
        createMockBackup({ id: 'new', status: 'completed', size: 1000, completedAt: '2024-12-31T23:59:59Z' }),
        createMockBackup({ id: 'middle', status: 'completed', size: 1000, completedAt: '2024-06-15T12:00:00Z' }),
      ];
      vi.mocked(mockClient.getBackups).mockResolvedValue(backups);

      registerBackupTools(mockServer, mockClient);
      const tool = registeredTools.get('databasus_get_backup_stats');
      const result = await tool!.handler({});

      const parsedResult = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(parsedResult.lastBackupId).toBe('new');
      expect(parsedResult.lastBackupAt).toBe('2024-12-31T23:59:59Z');
    });

    it('should not count non-completed backups in total size', async () => {
      const backups: Backup[] = [
        createMockBackup({ id: 'b1', status: 'completed', size: 1000, completedAt: '2024-01-01T10:00:00Z' }),
        createMockBackup({ id: 'b2', status: 'failed', size: 5000 }),
        createMockBackup({ id: 'b3', status: 'running', size: 3000 }),
        createMockBackup({ id: 'b4', status: 'pending', size: 2000 }),
      ];
      vi.mocked(mockClient.getBackups).mockResolvedValue(backups);

      registerBackupTools(mockServer, mockClient);
      const tool = registeredTools.get('databasus_get_backup_stats');
      const result = await tool!.handler({});

      const parsedResult = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(parsedResult.totalSize).toBe(1000);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(mockClient.getBackups).mockRejectedValue(new Error('Service unavailable'));

      registerBackupTools(mockServer, mockClient);
      const tool = registeredTools.get('databasus_get_backup_stats');
      const result = await tool!.handler({});

      const parsedResult = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(parsedResult).toEqual({ error: 'Service unavailable' });
    });

    it('should handle non-Error errors', async () => {
      vi.mocked(mockClient.getBackups).mockRejectedValue('something bad');

      registerBackupTools(mockServer, mockClient);
      const tool = registeredTools.get('databasus_get_backup_stats');
      const result = await tool!.handler({});

      const parsedResult = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(parsedResult).toEqual({ error: 'Failed to get backup statistics' });
    });
  });

  describe('formatBytes helper', () => {
    const getStatsResult = async (backups: Backup[]): Promise<{ totalSizeFormatted: string }> => {
      vi.mocked(mockClient.getBackups).mockResolvedValue(backups);
      registerBackupTools(mockServer, mockClient);
      const tool = registeredTools.get('databasus_get_backup_stats');
      const result = await tool!.handler({});
      return JSON.parse((result as { content: { text: string }[] }).content[0].text);
    };

    it('should format 0 bytes correctly', async () => {
      const result = await getStatsResult([]);
      expect(result.totalSizeFormatted).toBe('0 B');
    });

    it('should format bytes correctly', async () => {
      const result = await getStatsResult([
        createMockBackup({ status: 'completed', size: 512, completedAt: '2024-01-01T10:00:00Z' }),
      ]);
      expect(result.totalSizeFormatted).toBe('512 B');
    });

    it('should format kilobytes correctly', async () => {
      const result = await getStatsResult([
        createMockBackup({ status: 'completed', size: 2048, completedAt: '2024-01-01T10:00:00Z' }),
      ]);
      expect(result.totalSizeFormatted).toBe('2 KB');
    });

    it('should format megabytes correctly', async () => {
      const result = await getStatsResult([
        createMockBackup({ status: 'completed', size: 1048576 * 5, completedAt: '2024-01-01T10:00:00Z' }),
      ]);
      expect(result.totalSizeFormatted).toBe('5 MB');
    });

    it('should format gigabytes correctly', async () => {
      const result = await getStatsResult([
        createMockBackup({ status: 'completed', size: 1073741824 * 2.5, completedAt: '2024-01-01T10:00:00Z' }),
      ]);
      expect(result.totalSizeFormatted).toBe('2.5 GB');
    });

    it('should format terabytes correctly', async () => {
      const result = await getStatsResult([
        createMockBackup({ status: 'completed', size: 1099511627776, completedAt: '2024-01-01T10:00:00Z' }),
      ]);
      expect(result.totalSizeFormatted).toBe('1 TB');
    });

    it('should format values with decimal precision', async () => {
      const result = await getStatsResult([
        createMockBackup({ status: 'completed', size: 1536, completedAt: '2024-01-01T10:00:00Z' }),
      ]);
      expect(result.totalSizeFormatted).toBe('1.5 KB');
    });
  });

  describe('Tool registration', () => {
    it('should register all 5 backup tools', () => {
      registerBackupTools(mockServer, mockClient);
      
      expect(registeredTools.size).toBe(5);
      expect(registeredTools.has('databasus_list_backups')).toBe(true);
      expect(registeredTools.has('databasus_get_backup')).toBe(true);
      expect(registeredTools.has('databasus_download_backup')).toBe(true);
      expect(registeredTools.has('databasus_delete_backup')).toBe(true);
      expect(registeredTools.has('databasus_get_backup_stats')).toBe(true);
    });

    it('should call server.tool with correct parameters', () => {
      registerBackupTools(mockServer, mockClient);
      
      const callCount = vi.mocked(mockServer.tool).mock.calls.length;
      expect(callCount).toBe(5);
      
      vi.mocked(mockServer.tool).mock.calls.forEach((call) => {
        expect(typeof call[0]).toBe('string');
        expect(typeof call[1]).toBe('string');
        expect(typeof call[2]).toBe('object');
        expect(typeof call[3]).toBe('function');
      });
    });
  });
});
