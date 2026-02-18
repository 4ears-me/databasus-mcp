import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DatabasusClient } from '../client.js';
import type {
  Database,
  Backup,
  Storage,
  Notifier,
  Workspace,
  HealthCheck,
  DatabaseStats,
  CreateDatabaseDto,
  UpdateDatabaseDto,
  CreateStorageDto,
  UpdateStorageDto,
  CreateNotifierDto,
  UpdateNotifierDto,
} from '../types.js';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const createMockResponse = (data: unknown, ok = true, status = 200): Response => {
  return {
    ok,
    status,
    text: async () => JSON.stringify(data),
    json: async () => data,
  } as Response;
};

const createEmptyResponse = (ok = true, status = 200): Response => {
  return {
    ok,
    status,
    text: async () => '',
    json: async () => ({}),
  } as Response;
};

const createTextResponse = (text: string, ok = true, status = 200): Response => {
  return {
    ok,
    status,
    text: async () => text,
    json: async () => JSON.parse(text),
  } as Response;
};

const mockDatabase: Database = {
  id: 'db-1',
  name: 'Test Database',
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  databaseName: 'testdb',
  username: 'testuser',
  sslMode: 'prefer',
  scheduleType: 'daily',
  scheduleValue: '0 2 * * *',
  retentionDays: 7,
  enabled: true,
  storageId: 'storage-1',
  notifierIds: ['notifier-1'],
  healthCheckEnabled: true,
  healthCheckIntervalMinutes: 5,
  lastBackupAt: '2026-02-18T00:00:00Z',
  lastBackupStatus: 'completed',
  nextBackupAt: '2026-02-19T02:00:00Z',
  healthStatus: 'healthy',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-02-18T00:00:00Z',
};

const mockBackup: Backup = {
  id: 'backup-1',
  databaseId: 'db-1',
  status: 'completed',
  size: 1024000,
  duration: 5000,
  startedAt: '2026-02-18T00:00:00Z',
  completedAt: '2026-02-18T00:01:00Z',
  storagePath: '/backups/db-1/2026-02-18.sql.gz',
  encrypted: true,
  compressed: true,
};

const mockStorage: Storage = {
  id: 'storage-1',
  name: 'Test Storage',
  type: 's3',
  enabled: true,
  config: { bucket: 'test-bucket', region: 'us-east-1' },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-02-18T00:00:00Z',
};

const mockNotifier: Notifier = {
  id: 'notifier-1',
  name: 'Test Notifier',
  type: 'slack',
  enabled: true,
  config: { webhookUrl: 'https://hooks.slack.com/test' },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-02-18T00:00:00Z',
};

const mockWorkspace: Workspace = {
  id: 'workspace-1',
  name: 'Test Workspace',
  description: 'A test workspace',
  memberCount: 5,
  databaseCount: 10,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-02-18T00:00:00Z',
};

const mockHealthCheck: HealthCheck = {
  id: 'hc-1',
  databaseId: 'db-1',
  status: 'healthy',
  responseTimeMs: 50,
  checkedAt: '2026-02-18T00:00:00Z',
};

const mockStats: DatabaseStats = {
  totalDatabases: 10,
  healthyDatabases: 8,
  unhealthyDatabases: 2,
  totalBackups: 100,
  totalSize: 1024000000,
  lastBackupAt: '2026-02-18T00:00:00Z',
};

describe('DatabasusClient', () => {
  let client: DatabasusClient;

  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create client with baseUrl and apiKey', () => {
      client = new DatabasusClient({
        baseUrl: 'https://test.databasus.com',
        apiKey: 'test-api-key',
      });
      expect(client).toBeInstanceOf(DatabasusClient);
    });

    it('should create client with baseUrl and bearerToken', () => {
      client = new DatabasusClient({
        baseUrl: 'https://test.databasus.com',
        bearerToken: 'test-bearer-token',
      });
      expect(client).toBeInstanceOf(DatabasusClient);
    });

    it('should create client with baseUrl only (no auth)', () => {
      client = new DatabasusClient({
        baseUrl: 'https://test.databasus.com',
      });
      expect(client).toBeInstanceOf(DatabasusClient);
    });

    it('should strip trailing slash from baseUrl', async () => {
      client = new DatabasusClient({
        baseUrl: 'https://test.databasus.com/',
        apiKey: 'test-api-key',
      });
      mockFetch.mockResolvedValueOnce(createMockResponse([]));
      await client.getDatabases();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.databasus.com/api/databases',
        expect.any(Object)
      );
    });
  });

  describe('Authentication Headers', () => {
    it('should send X-API-Key header when using apiKey', async () => {
      client = new DatabasusClient({
        baseUrl: 'https://test.databasus.com',
        apiKey: 'test-api-key',
      });
      mockFetch.mockResolvedValueOnce(createMockResponse([]));
      await client.getDatabases();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'test-api-key',
          }),
        })
      );
    });

    it('should send Authorization Bearer header when using bearerToken', async () => {
      client = new DatabasusClient({
        baseUrl: 'https://test.databasus.com',
        bearerToken: 'test-bearer-token',
      });
      mockFetch.mockResolvedValueOnce(createMockResponse([]));
      await client.getDatabases();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-bearer-token',
          }),
        })
      );
    });

    it('should prefer bearerToken over apiKey when both are provided', async () => {
      client = new DatabasusClient({
        baseUrl: 'https://test.databasus.com',
        apiKey: 'test-api-key',
        bearerToken: 'test-bearer-token',
      });
      mockFetch.mockResolvedValueOnce(createMockResponse([]));
      await client.getDatabases();
      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers).toHaveProperty('Authorization');
      expect(callArgs.headers).not.toHaveProperty('X-API-Key');
    });

    it('should not send auth headers when neither apiKey nor bearerToken is provided', async () => {
      client = new DatabasusClient({
        baseUrl: 'https://test.databasus.com',
      });
      mockFetch.mockResolvedValueOnce(createMockResponse([]));
      await client.getDatabases();
      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers).not.toHaveProperty('Authorization');
      expect(callArgs.headers).not.toHaveProperty('X-API-Key');
    });

    it('should always send Content-Type header', async () => {
      client = new DatabasusClient({
        baseUrl: 'https://test.databasus.com',
        apiKey: 'test-api-key',
      });
      mockFetch.mockResolvedValueOnce(createMockResponse([]));
      await client.getDatabases();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  describe('Database Operations', () => {
    beforeEach(() => {
      client = new DatabasusClient({
        baseUrl: 'https://test.databasus.com',
        apiKey: 'test-api-key',
      });
    });

    describe('getDatabases', () => {
      it('should fetch all databases', async () => {
        const databases = [mockDatabase];
        mockFetch.mockResolvedValueOnce(createMockResponse(databases));
        const result = await client.getDatabases();
        expect(result).toEqual(databases);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.databasus.com/api/databases',
          expect.objectContaining({ method: 'GET' })
        );
      });

      it('should return empty array when no databases', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse([]));
        const result = await client.getDatabases();
        expect(result).toEqual([]);
      });
    });

    describe('getDatabase', () => {
      it('should fetch a single database by id', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse(mockDatabase));
        const result = await client.getDatabase('db-1');
        expect(result).toEqual(mockDatabase);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.databasus.com/api/databases/db-1',
          expect.objectContaining({ method: 'GET' })
        );
      });
    });

    describe('createDatabase', () => {
      it('should create a new database', async () => {
        const createDto: CreateDatabaseDto = {
          name: 'New Database',
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          databaseName: 'newdb',
          username: 'user',
          password: 'password',
          scheduleType: 'daily',
          scheduleValue: '0 2 * * *',
          storageId: 'storage-1',
        };
        mockFetch.mockResolvedValueOnce(createMockResponse({ ...mockDatabase, ...createDto }));
        const result = await client.createDatabase(createDto);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.databasus.com/api/databases',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(createDto),
          })
        );
        expect(result.name).toBe('New Database');
      });
    });

    describe('updateDatabase', () => {
      it('should update an existing database', async () => {
        const updateDto: UpdateDatabaseDto = { name: 'Updated Database' };
        mockFetch.mockResolvedValueOnce(createMockResponse({ ...mockDatabase, ...updateDto }));
        const result = await client.updateDatabase('db-1', updateDto);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.databasus.com/api/databases/db-1',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify(updateDto),
          })
        );
        expect(result.name).toBe('Updated Database');
      });
    });

    describe('deleteDatabase', () => {
      it('should delete a database', async () => {
        mockFetch.mockResolvedValueOnce(createEmptyResponse());
        await client.deleteDatabase('db-1');
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.databasus.com/api/databases/db-1',
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });

    describe('triggerBackup', () => {
      it('should trigger a backup for a database', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse(mockBackup));
        const result = await client.triggerBackup('db-1');
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.databasus.com/api/databases/db-1/backup',
          expect.objectContaining({ method: 'POST' })
        );
        expect(result).toEqual(mockBackup);
      });
    });
  });

  describe('Backup Operations', () => {
    beforeEach(() => {
      client = new DatabasusClient({
        baseUrl: 'https://test.databasus.com',
        apiKey: 'test-api-key',
      });
    });

    describe('getBackups', () => {
      it('should fetch all backups', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse([mockBackup]));
        const result = await client.getBackups();
        expect(result).toEqual([mockBackup]);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.databasus.com/api/backups',
          expect.objectContaining({ method: 'GET' })
        );
      });

      it('should fetch backups filtered by databaseId', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse([mockBackup]));
        const result = await client.getBackups('db-1');
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.databasus.com/api/backups?databaseId=db-1',
          expect.objectContaining({ method: 'GET' })
        );
        expect(result).toEqual([mockBackup]);
      });
    });

    describe('getBackup', () => {
      it('should fetch a single backup by id', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse(mockBackup));
        const result = await client.getBackup('backup-1');
        expect(result).toEqual(mockBackup);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.databasus.com/api/backups/backup-1',
          expect.objectContaining({ method: 'GET' })
        );
      });
    });

    describe('downloadBackup', () => {
      it('should get download info for a backup', async () => {
        const downloadInfo = { url: 'https://storage.example.com/backup.sql.gz' };
        mockFetch.mockResolvedValueOnce(createMockResponse(downloadInfo));
        const result = await client.downloadBackup('backup-1');
        expect(result).toEqual(downloadInfo);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.databasus.com/api/backups/backup-1/download',
          expect.objectContaining({ method: 'GET' })
        );
      });
    });

    describe('deleteBackup', () => {
      it('should delete a backup', async () => {
        mockFetch.mockResolvedValueOnce(createEmptyResponse());
        await client.deleteBackup('backup-1');
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.databasus.com/api/backups/backup-1',
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });
  });

  describe('Storage Operations', () => {
    beforeEach(() => {
      client = new DatabasusClient({
        baseUrl: 'https://test.databasus.com',
        apiKey: 'test-api-key',
      });
    });

    describe('getStorages', () => {
      it('should fetch all storages', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse([mockStorage]));
        const result = await client.getStorages();
        expect(result).toEqual([mockStorage]);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.databasus.com/api/storages',
          expect.objectContaining({ method: 'GET' })
        );
      });
    });

    describe('getStorage', () => {
      it('should fetch a single storage by id', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse(mockStorage));
        const result = await client.getStorage('storage-1');
        expect(result).toEqual(mockStorage);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.databasus.com/api/storages/storage-1',
          expect.objectContaining({ method: 'GET' })
        );
      });
    });

    describe('createStorage', () => {
      it('should create a new storage', async () => {
        const createDto: CreateStorageDto = {
          name: 'New Storage',
          type: 's3',
          config: { bucket: 'new-bucket', region: 'us-west-2' },
        };
        mockFetch.mockResolvedValueOnce(createMockResponse({ ...mockStorage, ...createDto }));
        const result = await client.createStorage(createDto);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.databasus.com/api/storages',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(createDto),
          })
        );
        expect(result.name).toBe('New Storage');
      });
    });

    describe('updateStorage', () => {
      it('should update an existing storage', async () => {
        const updateDto: UpdateStorageDto = { name: 'Updated Storage' };
        mockFetch.mockResolvedValueOnce(createMockResponse({ ...mockStorage, ...updateDto }));
        const result = await client.updateStorage('storage-1', updateDto);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.databasus.com/api/storages/storage-1',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify(updateDto),
          })
        );
        expect(result.name).toBe('Updated Storage');
      });
    });

    describe('deleteStorage', () => {
      it('should delete a storage', async () => {
        mockFetch.mockResolvedValueOnce(createEmptyResponse());
        await client.deleteStorage('storage-1');
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.databasus.com/api/storages/storage-1',
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });

    describe('testStorage', () => {
      it('should test a storage connection', async () => {
        const testResult = { success: true, message: 'Connection successful' };
        mockFetch.mockResolvedValueOnce(createMockResponse(testResult));
        const result = await client.testStorage('storage-1');
        expect(result).toEqual(testResult);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.databasus.com/api/storages/storage-1/test',
          expect.objectContaining({ method: 'POST' })
        );
      });

      it('should return failure result when test fails', async () => {
        const testResult = { success: false, message: 'Connection failed' };
        mockFetch.mockResolvedValueOnce(createMockResponse(testResult));
        const result = await client.testStorage('storage-1');
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Notifier Operations', () => {
    beforeEach(() => {
      client = new DatabasusClient({
        baseUrl: 'https://test.databasus.com',
        apiKey: 'test-api-key',
      });
    });

    describe('getNotifiers', () => {
      it('should fetch all notifiers', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse([mockNotifier]));
        const result = await client.getNotifiers();
        expect(result).toEqual([mockNotifier]);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.databasus.com/api/notifiers',
          expect.objectContaining({ method: 'GET' })
        );
      });
    });

    describe('getNotifier', () => {
      it('should fetch a single notifier by id', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse(mockNotifier));
        const result = await client.getNotifier('notifier-1');
        expect(result).toEqual(mockNotifier);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.databasus.com/api/notifiers/notifier-1',
          expect.objectContaining({ method: 'GET' })
        );
      });
    });

    describe('createNotifier', () => {
      it('should create a new notifier', async () => {
        const createDto: CreateNotifierDto = {
          name: 'New Notifier',
          type: 'slack',
          config: { webhookUrl: 'https://hooks.slack.com/new' },
        };
        mockFetch.mockResolvedValueOnce(createMockResponse({ ...mockNotifier, ...createDto }));
        const result = await client.createNotifier(createDto);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.databasus.com/api/notifiers',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(createDto),
          })
        );
        expect(result.name).toBe('New Notifier');
      });
    });

    describe('updateNotifier', () => {
      it('should update an existing notifier', async () => {
        const updateDto: UpdateNotifierDto = { name: 'Updated Notifier' };
        mockFetch.mockResolvedValueOnce(createMockResponse({ ...mockNotifier, ...updateDto }));
        const result = await client.updateNotifier('notifier-1', updateDto);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.databasus.com/api/notifiers/notifier-1',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify(updateDto),
          })
        );
        expect(result.name).toBe('Updated Notifier');
      });
    });

    describe('deleteNotifier', () => {
      it('should delete a notifier', async () => {
        mockFetch.mockResolvedValueOnce(createEmptyResponse());
        await client.deleteNotifier('notifier-1');
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.databasus.com/api/notifiers/notifier-1',
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });

    describe('testNotifier', () => {
      it('should test a notifier by sending test notification', async () => {
        const testResult = { success: true, message: 'Notification sent' };
        mockFetch.mockResolvedValueOnce(createMockResponse(testResult));
        const result = await client.testNotifier('notifier-1');
        expect(result).toEqual(testResult);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.databasus.com/api/notifiers/notifier-1/test',
          expect.objectContaining({ method: 'POST' })
        );
      });
    });
  });

  describe('Workspace Operations', () => {
    beforeEach(() => {
      client = new DatabasusClient({
        baseUrl: 'https://test.databasus.com',
        apiKey: 'test-api-key',
      });
    });

    describe('getWorkspaces', () => {
      it('should fetch all workspaces', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse([mockWorkspace]));
        const result = await client.getWorkspaces();
        expect(result).toEqual([mockWorkspace]);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.databasus.com/api/workspaces',
          expect.objectContaining({ method: 'GET' })
        );
      });
    });

    describe('getWorkspace', () => {
      it('should fetch a single workspace by id', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse(mockWorkspace));
        const result = await client.getWorkspace('workspace-1');
        expect(result).toEqual(mockWorkspace);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.databasus.com/api/workspaces/workspace-1',
          expect.objectContaining({ method: 'GET' })
        );
      });
    });
  });

  describe('Health Check Operations', () => {
    beforeEach(() => {
      client = new DatabasusClient({
        baseUrl: 'https://test.databasus.com',
        apiKey: 'test-api-key',
      });
    });

    describe('getHealthChecks', () => {
      it('should fetch health checks for a database', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse([mockHealthCheck]));
        const result = await client.getHealthChecks('db-1');
        expect(result).toEqual([mockHealthCheck]);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.databasus.com/api/databases/db-1/health-checks',
          expect.objectContaining({ method: 'GET' })
        );
      });
    });

    describe('getLatestHealthCheck', () => {
      it('should fetch the latest health check for a database', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse(mockHealthCheck));
        const result = await client.getLatestHealthCheck('db-1');
        expect(result).toEqual(mockHealthCheck);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.databasus.com/api/databases/db-1/health-checks/latest',
          expect.objectContaining({ method: 'GET' })
        );
      });
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      client = new DatabasusClient({
        baseUrl: 'https://test.databasus.com',
        apiKey: 'test-api-key',
      });
    });

    describe('getStats', () => {
      it('should fetch overall statistics', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse(mockStats));
        const result = await client.getStats();
        expect(result).toEqual(mockStats);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.databasus.com/api/stats',
          expect.objectContaining({ method: 'GET' })
        );
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      client = new DatabasusClient({
        baseUrl: 'https://test.databasus.com',
        apiKey: 'test-api-key',
      });
    });

    describe('Network Errors', () => {
      it('should throw network error when fetch fails', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network failure'));
        await expect(client.getDatabases()).rejects.toThrow('Network error: Network failure');
      });

      it('should handle unknown network errors', async () => {
        mockFetch.mockRejectedValueOnce('Unknown error');
        await expect(client.getDatabases()).rejects.toThrow('Network error: Unknown error');
      });
    });

    describe('HTTP Errors', () => {
      it('should throw error with error message from response', async () => {
        mockFetch.mockResolvedValueOnce(
          createMockResponse({ error: 'Database not found' }, false, 404)
        );
        await expect(client.getDatabase('invalid-id')).rejects.toThrow('Database not found');
      });

      it('should throw error with message from response', async () => {
        mockFetch.mockResolvedValueOnce(
          createMockResponse({ message: 'Access denied' }, false, 403)
        );
        await expect(client.getDatabases()).rejects.toThrow('Access denied');
      });

      it('should throw generic HTTP error when no message in response', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 500));
        await expect(client.getDatabases()).rejects.toThrow('HTTP error 500');
      });

      it('should throw error for 401 unauthorized', async () => {
        mockFetch.mockResolvedValueOnce(
          createMockResponse({ error: 'Invalid API key' }, false, 401)
        );
        await expect(client.getDatabases()).rejects.toThrow('Invalid API key');
      });

      it('should throw error for 400 bad request', async () => {
        mockFetch.mockResolvedValueOnce(
          createMockResponse({ message: 'Invalid input data' }, false, 400)
        );
        await expect(client.createDatabase({} as CreateDatabaseDto)).rejects.toThrow(
          'Invalid input data'
        );
      });

      it('should throw error for 409 conflict', async () => {
        mockFetch.mockResolvedValueOnce(
          createMockResponse({ error: 'Database already exists' }, false, 409)
        );
        await expect(client.createDatabase({} as CreateDatabaseDto)).rejects.toThrow(
          'Database already exists'
        );
      });
    });

    describe('JSON Parse Errors', () => {
      it('should throw error for invalid JSON response', async () => {
        mockFetch.mockResolvedValueOnce(createTextResponse('not valid json', true, 200));
        await expect(client.getDatabases()).rejects.toThrow('Invalid JSON response: not valid json');
      });

      it('should truncate long invalid JSON in error message', async () => {
        const longInvalidJson = 'a'.repeat(200);
        mockFetch.mockResolvedValueOnce(createTextResponse(longInvalidJson, true, 200));
        await expect(client.getDatabases()).rejects.toThrow(
          `Invalid JSON response: ${longInvalidJson.substring(0, 100)}`
        );
      });
    });

    describe('Empty Response Handling', () => {
      it('should handle empty response body', async () => {
        mockFetch.mockResolvedValueOnce(createEmptyResponse());
        const result = await client.deleteDatabase('db-1');
        expect(result).toBeUndefined();
      });
    });
  });

  describe('Request Options', () => {
    beforeEach(() => {
      client = new DatabasusClient({
        baseUrl: 'https://test.databasus.com',
        apiKey: 'test-api-key',
      });
    });

    it('should not include body for GET requests', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([]));
      await client.getDatabases();
      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.body).toBeUndefined();
    });

    it('should stringify body for POST requests', async () => {
      const createDto: CreateDatabaseDto = {
        name: 'Test',
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        databaseName: 'test',
        username: 'user',
        password: 'pass',
        scheduleType: 'daily',
        scheduleValue: '0 0 * * *',
        storageId: 'storage-1',
      };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockDatabase));
      await client.createDatabase(createDto);
      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.body).toBe(JSON.stringify(createDto));
    });

    it('should stringify body for PUT requests', async () => {
      const updateDto: UpdateDatabaseDto = { name: 'Updated' };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockDatabase));
      await client.updateDatabase('db-1', updateDto);
      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.body).toBe(JSON.stringify(updateDto));
    });

    it('should not include body for DELETE requests', async () => {
      mockFetch.mockResolvedValueOnce(createEmptyResponse());
      await client.deleteDatabase('db-1');
      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.body).toBeUndefined();
    });
  });

  describe('URL Construction', () => {
    beforeEach(() => {
      client = new DatabasusClient({
        baseUrl: 'https://test.databasus.com',
        apiKey: 'test-api-key',
      });
    });

    it('should correctly construct URLs with path parameters', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockDatabase));
      await client.getDatabase('db-123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.databasus.com/api/databases/db-123',
        expect.any(Object)
      );
    });

    it('should correctly construct URLs with query parameters', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([mockBackup]));
      await client.getBackups('db-456');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.databasus.com/api/backups?databaseId=db-456',
        expect.any(Object)
      );
    });

    it('should handle baseUrl without trailing slash', async () => {
      client = new DatabasusClient({
        baseUrl: 'https://test.databasus.com',
        apiKey: 'test-api-key',
      });
      mockFetch.mockResolvedValueOnce(createMockResponse([]));
      await client.getDatabases();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.databasus.com/api/databases',
        expect.any(Object)
      );
    });
  });
});
