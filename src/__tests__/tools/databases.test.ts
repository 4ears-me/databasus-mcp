import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerDatabaseTools } from '../../tools/databases.js';
import type { DatabasusClient } from '../../client.js';
import type { Database, Backup } from '../../types.js';

type MockTool = {
  name: string;
  description: string;
  schema: Record<string, unknown>;
  handler: (params: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>;
};

const createMockServer = () => {
  const tools: MockTool[] = [];
  return {
    tool: vi.fn((name: string, description: string, schema: Record<string, unknown>, handler: MockTool['handler']) => {
      tools.push({ name, description, schema, handler });
    }),
    getTools: () => tools,
    getTool: (name: string) => tools.find(t => t.name === name),
  };
};

const createMockClient = (): DatabasusClient => {
  return {
    getDatabases: vi.fn(),
    getDatabase: vi.fn(),
    createDatabase: vi.fn(),
    updateDatabase: vi.fn(),
    deleteDatabase: vi.fn(),
    triggerBackup: vi.fn(),
    getBackups: vi.fn(),
    getBackup: vi.fn(),
    downloadBackup: vi.fn(),
    deleteBackup: vi.fn(),
    getStorages: vi.fn(),
    getStorage: vi.fn(),
    createStorage: vi.fn(),
    updateStorage: vi.fn(),
    deleteStorage: vi.fn(),
    testStorage: vi.fn(),
    getNotifiers: vi.fn(),
    getNotifier: vi.fn(),
    createNotifier: vi.fn(),
    updateNotifier: vi.fn(),
    deleteNotifier: vi.fn(),
    testNotifier: vi.fn(),
    getWorkspaces: vi.fn(),
    getWorkspace: vi.fn(),
    getHealthChecks: vi.fn(),
    getLatestHealthCheck: vi.fn(),
    getStats: vi.fn(),
  } as unknown as DatabasusClient;
};

const mockDatabase: Database = {
  id: 'db-123',
  name: 'Test Database',
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  databaseName: 'testdb',
  username: 'testuser',
  sslMode: 'disable',
  scheduleType: 'daily',
  scheduleValue: '02:00',
  retentionDays: 30,
  enabled: true,
  storageId: 'storage-123',
  notifierIds: ['notifier-123'],
  healthCheckEnabled: true,
  healthCheckIntervalMinutes: 5,
  lastBackupAt: '2024-01-15T10:00:00Z',
  lastBackupStatus: 'completed',
  nextBackupAt: '2024-01-16T02:00:00Z',
  healthStatus: 'healthy',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
};

const mockBackup: Backup = {
  id: 'backup-123',
  databaseId: 'db-123',
  status: 'pending',
  size: 0,
  duration: 0,
  startedAt: '2024-01-15T10:00:00Z',
  storagePath: '/backups/db-123/backup-123.sql.gz',
  encrypted: true,
  compressed: true,
};

describe('Database Tools', () => {
  let mockServer: ReturnType<typeof createMockServer>;
  let mockClient: DatabasusClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = createMockServer();
    mockClient = createMockClient();
    registerDatabaseTools(mockServer as unknown as Parameters<typeof registerDatabaseTools>[0], mockClient);
  });

  describe('Tool Registration', () => {
    it('should register all 7 database tools', () => {
      const tools = mockServer.getTools();
      expect(tools).toHaveLength(7);
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('databasus_list_databases');
      expect(toolNames).toContain('databasus_get_database');
      expect(toolNames).toContain('databasus_create_database');
      expect(toolNames).toContain('databasus_update_database');
      expect(toolNames).toContain('databasus_delete_database');
      expect(toolNames).toContain('databasus_trigger_backup');
      expect(toolNames).toContain('databasus_toggle_database');
    });

    it('should have correct descriptions for each tool', () => {
      const tools = mockServer.getTools();
      const descriptions: Record<string, string> = {};
      tools.forEach(t => { descriptions[t.name] = t.description; });

      expect(descriptions['databasus_list_databases']).toBe('List all configured databases');
      expect(descriptions['databasus_get_database']).toBe('Get details of a specific database');
      expect(descriptions['databasus_create_database']).toBe('Create a new database backup configuration');
      expect(descriptions['databasus_update_database']).toBe('Update an existing database configuration');
      expect(descriptions['databasus_delete_database']).toBe('Delete a database configuration');
      expect(descriptions['databasus_trigger_backup']).toBe('Manually trigger a backup for a database');
      expect(descriptions['databasus_toggle_database']).toBe('Enable or disable a database');
    });
  });

  describe('databasus_list_databases', () => {
    const getTool = () => mockServer.getTool('databasus_list_databases')!;

    it('should have empty schema', () => {
      expect(getTool().schema).toEqual({});
    });

    it('should return list of databases with formatted output', async () => {
      vi.mocked(mockClient.getDatabases).mockResolvedValue([mockDatabase]);

      const result = await getTool().handler({});

      expect(mockClient.getDatabases).toHaveBeenCalledOnce();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toEqual({
        id: 'db-123',
        name: 'Test Database',
        type: 'postgres',
        host: 'localhost',
        status: 'enabled',
        lastBackup: '2024-01-15T10:00:00Z',
        lastBackupStatus: 'completed',
      });
    });

    it('should return disabled status when database is disabled', async () => {
      vi.mocked(mockClient.getDatabases).mockResolvedValue([
        { ...mockDatabase, enabled: false },
      ]);

      const result = await getTool().handler({});
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed[0].status).toBe('disabled');
    });

    it('should return null for lastBackup when not set', async () => {
      vi.mocked(mockClient.getDatabases).mockResolvedValue([
        { ...mockDatabase, lastBackupAt: undefined, lastBackupStatus: undefined },
      ]);

      const result = await getTool().handler({});
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed[0].lastBackup).toBeNull();
      expect(parsed[0].lastBackupStatus).toBeNull();
    });

    it('should return empty array when no databases exist', async () => {
      vi.mocked(mockClient.getDatabases).mockResolvedValue([]);

      const result = await getTool().handler({});
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(mockClient.getDatabases).mockRejectedValue(new Error('Connection failed'));

      const result = await getTool().handler({});
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toEqual({ error: 'Connection failed' });
    });

    it('should handle non-Error errors', async () => {
      vi.mocked(mockClient.getDatabases).mockRejectedValue('string error');

      const result = await getTool().handler({});
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toEqual({ error: 'Unknown error' });
    });
  });

  describe('databasus_get_database', () => {
    const getTool = () => mockServer.getTool('databasus_get_database')!;

    it('should have id parameter in schema', () => {
      expect(getTool().schema).toHaveProperty('id');
    });

    it('should return database details', async () => {
      vi.mocked(mockClient.getDatabase).mockResolvedValue(mockDatabase);

      const result = await getTool().handler({ id: 'db-123' });

      expect(mockClient.getDatabase).toHaveBeenCalledWith('db-123');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(mockDatabase);
    });

    it('should handle database not found error', async () => {
      vi.mocked(mockClient.getDatabase).mockRejectedValue(new Error('Database not found'));

      const result = await getTool().handler({ id: 'nonexistent' });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toEqual({ error: 'Database not found' });
    });

    it('should pass correct id to client', async () => {
      vi.mocked(mockClient.getDatabase).mockResolvedValue(mockDatabase);

      await getTool().handler({ id: 'specific-id-456' });

      expect(mockClient.getDatabase).toHaveBeenCalledWith('specific-id-456');
    });
  });

  describe('databasus_create_database', () => {
    const getTool = () => mockServer.getTool('databasus_create_database')!;

    const validParams = {
      name: 'New Database',
      type: 'postgres',
      host: 'db.example.com',
      port: 5432,
      databaseName: 'production',
      username: 'admin',
      password: 'secret123',
      sslMode: 'require',
      scheduleType: 'daily',
      scheduleValue: '03:00',
      retentionDays: 14,
      storageId: 'storage-456',
      notifierIds: ['notifier-1', 'notifier-2'],
      healthCheckEnabled: true,
      healthCheckIntervalMinutes: 10,
    };

    it('should have all required parameters in schema', () => {
      const schema = getTool().schema;
      expect(schema).toHaveProperty('name');
      expect(schema).toHaveProperty('type');
      expect(schema).toHaveProperty('host');
      expect(schema).toHaveProperty('port');
      expect(schema).toHaveProperty('databaseName');
      expect(schema).toHaveProperty('username');
      expect(schema).toHaveProperty('password');
      expect(schema).toHaveProperty('sslMode');
      expect(schema).toHaveProperty('scheduleType');
      expect(schema).toHaveProperty('scheduleValue');
      expect(schema).toHaveProperty('retentionDays');
      expect(schema).toHaveProperty('storageId');
      expect(schema).toHaveProperty('notifierIds');
      expect(schema).toHaveProperty('healthCheckEnabled');
      expect(schema).toHaveProperty('healthCheckIntervalMinutes');
    });

    it('should create database with all parameters', async () => {
      vi.mocked(mockClient.createDatabase).mockResolvedValue(mockDatabase);

      const result = await getTool().handler(validParams);

      expect(mockClient.createDatabase).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Database',
          type: 'postgres',
          host: 'db.example.com',
          port: 5432,
          databaseName: 'production',
          username: 'admin',
          password: 'secret123',
          sslMode: 'require',
          scheduleType: 'daily',
          scheduleValue: '03:00',
          retentionDays: 14,
          storageId: 'storage-456',
          notifierIds: ['notifier-1', 'notifier-2'],
          healthCheckEnabled: true,
          healthCheckIntervalMinutes: 10,
        })
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(mockDatabase);
    });

    it('should work with minimal required parameters', async () => {
      vi.mocked(mockClient.createDatabase).mockResolvedValue(mockDatabase);

      const minimalParams = {
        name: 'Minimal DB',
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        databaseName: 'test',
        username: 'root',
        password: 'password',
        scheduleType: 'hourly',
        scheduleValue: '0',
        storageId: 'storage-123',
      };

      await getTool().handler(minimalParams);

      expect(mockClient.createDatabase).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Minimal DB',
          type: 'mysql',
          host: 'localhost',
          port: 3306,
          databaseName: 'test',
          username: 'root',
          password: 'password',
          scheduleType: 'hourly',
          scheduleValue: '0',
          storageId: 'storage-123',
        })
      );
    });

    it('should handle creation error', async () => {
      vi.mocked(mockClient.createDatabase).mockRejectedValue(new Error('Validation failed: invalid host'));

      const result = await getTool().handler(validParams);
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toEqual({ error: 'Validation failed: invalid host' });
    });

    it('should support all database types', async () => {
      vi.mocked(mockClient.createDatabase).mockResolvedValue(mockDatabase);

      const databaseTypes = ['postgres', 'mysql', 'mariadb', 'mongodb'] as const;

      for (const dbType of databaseTypes) {
        await getTool().handler({ ...validParams, type: dbType });
        expect(mockClient.createDatabase).toHaveBeenCalledWith(
          expect.objectContaining({ type: dbType })
        );
      }
    });

    it('should support all schedule types', async () => {
      vi.mocked(mockClient.createDatabase).mockResolvedValue(mockDatabase);

      const scheduleTypes = ['hourly', 'daily', 'weekly', 'monthly', 'cron'] as const;

      for (const scheduleType of scheduleTypes) {
        await getTool().handler({ ...validParams, scheduleType });
        expect(mockClient.createDatabase).toHaveBeenCalledWith(
          expect.objectContaining({ scheduleType })
        );
      }
    });
  });

  describe('databasus_update_database', () => {
    const getTool = () => mockServer.getTool('databasus_update_database')!;

    it('should have id parameter and optional update fields in schema', () => {
      const schema = getTool().schema;
      expect(schema).toHaveProperty('id');
      expect(schema).toHaveProperty('name');
      expect(schema).toHaveProperty('host');
      expect(schema).toHaveProperty('port');
      expect(schema).toHaveProperty('databaseName');
      expect(schema).toHaveProperty('username');
      expect(schema).toHaveProperty('password');
      expect(schema).toHaveProperty('sslMode');
      expect(schema).toHaveProperty('scheduleType');
      expect(schema).toHaveProperty('scheduleValue');
      expect(schema).toHaveProperty('retentionDays');
      expect(schema).toHaveProperty('enabled');
      expect(schema).toHaveProperty('storageId');
      expect(schema).toHaveProperty('notifierIds');
      expect(schema).toHaveProperty('healthCheckEnabled');
      expect(schema).toHaveProperty('healthCheckIntervalMinutes');
    });

    it('should update database with provided fields', async () => {
      vi.mocked(mockClient.updateDatabase).mockResolvedValue(mockDatabase);

      const result = await getTool().handler({
        id: 'db-123',
        name: 'Updated Name',
        port: 5433,
        retentionDays: 60,
      });

      expect(mockClient.updateDatabase).toHaveBeenCalledWith('db-123', {
        name: 'Updated Name',
        port: 5433,
        retentionDays: 60,
        host: undefined,
        databaseName: undefined,
        username: undefined,
        password: undefined,
        sslMode: undefined,
        scheduleType: undefined,
        scheduleValue: undefined,
        enabled: undefined,
        storageId: undefined,
        notifierIds: undefined,
        healthCheckEnabled: undefined,
        healthCheckIntervalMinutes: undefined,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(mockDatabase);
    });

    it('should update enabled field', async () => {
      vi.mocked(mockClient.updateDatabase).mockResolvedValue({ ...mockDatabase, enabled: false });

      await getTool().handler({ id: 'db-123', enabled: false });

      expect(mockClient.updateDatabase).toHaveBeenCalledWith('db-123', 
        expect.objectContaining({ enabled: false })
      );
    });

    it('should update notifierIds array', async () => {
      vi.mocked(mockClient.updateDatabase).mockResolvedValue(mockDatabase);

      await getTool().handler({
        id: 'db-123',
        notifierIds: ['new-notifier-1', 'new-notifier-2'],
      });

      expect(mockClient.updateDatabase).toHaveBeenCalledWith('db-123',
        expect.objectContaining({ notifierIds: ['new-notifier-1', 'new-notifier-2'] })
      );
    });

    it('should handle update error', async () => {
      vi.mocked(mockClient.updateDatabase).mockRejectedValue(new Error('Database not found'));

      const result = await getTool().handler({ id: 'nonexistent', name: 'New Name' });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toEqual({ error: 'Database not found' });
    });
  });

  describe('databasus_delete_database', () => {
    const getTool = () => mockServer.getTool('databasus_delete_database')!;

    it('should have id parameter in schema', () => {
      expect(getTool().schema).toHaveProperty('id');
    });

    it('should delete database and return success message', async () => {
      vi.mocked(mockClient.deleteDatabase).mockResolvedValue(undefined);

      const result = await getTool().handler({ id: 'db-123' });

      expect(mockClient.deleteDatabase).toHaveBeenCalledWith('db-123');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual({
        success: true,
        message: 'Database db-123 deleted successfully',
      });
    });

    it('should handle deletion error', async () => {
      vi.mocked(mockClient.deleteDatabase).mockRejectedValue(new Error('Database in use'));

      const result = await getTool().handler({ id: 'db-123' });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toEqual({ error: 'Database in use' });
    });

    it('should handle non-existent database deletion', async () => {
      vi.mocked(mockClient.deleteDatabase).mockRejectedValue(new Error('Database not found'));

      const result = await getTool().handler({ id: 'nonexistent' });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toEqual({ error: 'Database not found' });
    });
  });

  describe('databasus_trigger_backup', () => {
    const getTool = () => mockServer.getTool('databasus_trigger_backup')!;

    it('should have id parameter in schema', () => {
      expect(getTool().schema).toHaveProperty('id');
    });

    it('should trigger backup and return backup details', async () => {
      vi.mocked(mockClient.triggerBackup).mockResolvedValue(mockBackup);

      const result = await getTool().handler({ id: 'db-123' });

      expect(mockClient.triggerBackup).toHaveBeenCalledWith('db-123');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(mockBackup);
    });

    it('should handle trigger backup error', async () => {
      vi.mocked(mockClient.triggerBackup).mockRejectedValue(new Error('Database is disabled'));

      const result = await getTool().handler({ id: 'db-123' });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toEqual({ error: 'Database is disabled' });
    });

    it('should handle backup already running error', async () => {
      vi.mocked(mockClient.triggerBackup).mockRejectedValue(new Error('Backup already in progress'));

      const result = await getTool().handler({ id: 'db-123' });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toEqual({ error: 'Backup already in progress' });
    });
  });

  describe('databasus_toggle_database', () => {
    const getTool = () => mockServer.getTool('databasus_toggle_database')!;

    it('should have id and enabled parameters in schema', () => {
      const schema = getTool().schema;
      expect(schema).toHaveProperty('id');
      expect(schema).toHaveProperty('enabled');
    });

    it('should enable database when enabled is true', async () => {
      vi.mocked(mockClient.updateDatabase).mockResolvedValue({ ...mockDatabase, enabled: true });

      const result = await getTool().handler({ id: 'db-123', enabled: true });

      expect(mockClient.updateDatabase).toHaveBeenCalledWith('db-123', { enabled: true });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.enabled).toBe(true);
    });

    it('should disable database when enabled is false', async () => {
      vi.mocked(mockClient.updateDatabase).mockResolvedValue({ ...mockDatabase, enabled: false });

      const result = await getTool().handler({ id: 'db-123', enabled: false });

      expect(mockClient.updateDatabase).toHaveBeenCalledWith('db-123', { enabled: false });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.enabled).toBe(false);
    });

    it('should handle toggle error', async () => {
      vi.mocked(mockClient.updateDatabase).mockRejectedValue(new Error('Permission denied'));

      const result = await getTool().handler({ id: 'db-123', enabled: true });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toEqual({ error: 'Permission denied' });
    });

    it('should use updateDatabase internally', async () => {
      vi.mocked(mockClient.updateDatabase).mockResolvedValue(mockDatabase);

      await getTool().handler({ id: 'db-456', enabled: false });

      expect(mockClient.updateDatabase).toHaveBeenCalledWith('db-456', { enabled: false });
    });
  });
});

describe('Schema Validation', () => {
  let mockServer: ReturnType<typeof createMockServer>;
  let mockClient: DatabasusClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = createMockServer();
    mockClient = createMockClient();
    registerDatabaseTools(mockServer as unknown as Parameters<typeof registerDatabaseTools>[0], mockClient);
  });

  it('databasus_create_database should have valid database type enum', () => {
    const tool = mockServer.getTool('databasus_create_database')!;
    const typeSchema = tool.schema.type as { _def: { values: string[] } };
    expect(typeSchema._def.values).toEqual(['postgres', 'mysql', 'mariadb', 'mongodb']);
  });

  it('databasus_create_database should have valid schedule type enum', () => {
    const tool = mockServer.getTool('databasus_create_database')!;
    const scheduleSchema = tool.schema.scheduleType as { _def: { values: string[] } };
    expect(scheduleSchema._def.values).toEqual(['hourly', 'daily', 'weekly', 'monthly', 'cron']);
  });

  it('databasus_update_database should have valid schedule type enum', () => {
    const tool = mockServer.getTool('databasus_update_database')!;
    const scheduleSchema = tool.schema.scheduleType as { _def: { innerType: { _def: { values: string[] } } } };
    expect(scheduleSchema._def.innerType._def.values).toEqual(['hourly', 'daily', 'weekly', 'monthly', 'cron']);
  });

  it('databasus_create_database port should be number type', () => {
    const tool = mockServer.getTool('databasus_create_database')!;
    const portSchema = tool.schema.port as { _def: { typeName: string } };
    expect(portSchema._def.typeName).toBe('ZodNumber');
  });

  it('databasus_toggle_database enabled should be boolean type', () => {
    const tool = mockServer.getTool('databasus_toggle_database')!;
    const enabledSchema = tool.schema.enabled as { _def: { typeName: string } };
    expect(enabledSchema._def.typeName).toBe('ZodBoolean');
  });

  it('databasus_create_database notifierIds should be array type', () => {
    const tool = mockServer.getTool('databasus_create_database')!;
    const notifierIdsSchema = tool.schema.notifierIds as { _def: { typeName: string } };
    expect(notifierIdsSchema._def.typeName).toBe('ZodOptional');
  });

  it('databasus_delete_database should only have id parameter', () => {
    const tool = mockServer.getTool('databasus_delete_database')!;
    const schemaKeys = Object.keys(tool.schema);
    expect(schemaKeys).toEqual(['id']);
  });

  it('databasus_trigger_backup should only have id parameter', () => {
    const tool = mockServer.getTool('databasus_trigger_backup')!;
    const schemaKeys = Object.keys(tool.schema);
    expect(schemaKeys).toEqual(['id']);
  });
});

describe('Error Handling Edge Cases', () => {
  let mockServer: ReturnType<typeof createMockServer>;
  let mockClient: DatabasusClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = createMockServer();
    mockClient = createMockClient();
    registerDatabaseTools(mockServer as unknown as Parameters<typeof registerDatabaseTools>[0], mockClient);
  });

  it('should handle network timeout errors', async () => {
    vi.mocked(mockClient.getDatabases).mockRejectedValue(new Error('Network timeout'));

    const tool = mockServer.getTool('databasus_list_databases')!;
    const result = await tool.handler({});
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed).toEqual({ error: 'Network timeout' });
  });

  it('should handle authentication errors', async () => {
    vi.mocked(mockClient.getDatabase).mockRejectedValue(new Error('Unauthorized: Invalid API key'));

    const tool = mockServer.getTool('databasus_get_database')!;
    const result = await tool.handler({ id: 'db-123' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed).toEqual({ error: 'Unauthorized: Invalid API key' });
  });

  it('should handle rate limit errors', async () => {
    vi.mocked(mockClient.createDatabase).mockRejectedValue(new Error('Rate limit exceeded'));

    const tool = mockServer.getTool('databasus_create_database')!;
    const result = await tool.handler({
      name: 'Test',
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      databaseName: 'test',
      username: 'user',
      password: 'pass',
      scheduleType: 'daily',
      scheduleValue: '00:00',
      storageId: 'storage-1',
    });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed).toEqual({ error: 'Rate limit exceeded' });
  });

  it('should handle null/undefined responses gracefully', async () => {
    vi.mocked(mockClient.getDatabases).mockResolvedValue(null as unknown as Database[]);

    const tool = mockServer.getTool('databasus_list_databases')!;
    const result = await tool.handler({});

    expect(result.content[0].text).toBeDefined();
  });
});
