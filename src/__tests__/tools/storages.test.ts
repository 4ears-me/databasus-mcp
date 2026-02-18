import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DatabasusClient } from '../../client.js';
import { registerStorageTools } from '../../tools/storages.js';
import type { Storage } from '../../types.js';

vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

function createMockClient(): {
  client: DatabasusClient;
  mocks: {
    getStorages: ReturnType<typeof vi.fn>;
    getStorage: ReturnType<typeof vi.fn>;
    createStorage: ReturnType<typeof vi.fn>;
    updateStorage: ReturnType<typeof vi.fn>;
    deleteStorage: ReturnType<typeof vi.fn>;
    testStorage: ReturnType<typeof vi.fn>;
  };
} {
  const mocks = {
    getStorages: vi.fn(),
    getStorage: vi.fn(),
    createStorage: vi.fn(),
    updateStorage: vi.fn(),
    deleteStorage: vi.fn(),
    testStorage: vi.fn(),
  };

  const client = {
    getStorages: mocks.getStorages,
    getStorage: mocks.getStorage,
    createStorage: mocks.createStorage,
    updateStorage: mocks.updateStorage,
    deleteStorage: mocks.deleteStorage,
    testStorage: mocks.testStorage,
  } as unknown as DatabasusClient;

  return { client, mocks };
}

function createMockServer(): {
  server: McpServer;
  tools: Map<string, { handler: (args: Record<string, unknown>) => Promise<unknown> }>;
} {
  const tools = new Map<string, { handler: (args: Record<string, unknown>) => Promise<unknown> }>();

  const server = {
    tool: vi.fn((name: string, _description: string, _schema: unknown, handler: () => Promise<unknown>) => {
      tools.set(name, { handler });
    }),
  } as unknown as McpServer;

  return { server, tools };
}

function createMockStorage(overrides: Partial<Storage> = {}): Storage {
  return {
    id: 'storage-123',
    name: 'Test Storage',
    type: 's3',
    enabled: true,
    config: {
      bucket: 'my-bucket',
      region: 'us-east-1',
      accessKey: 'AKIAIOSFODNN7EXAMPLE',
      secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    },
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    ...overrides,
  };
}

describe('Storage Tools', () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerStorageTools(mockServer.server, mockClient.client);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('databasus_list_storages', () => {
    it('should list storages successfully', async () => {
      const storages = [
        createMockStorage({ id: 'storage-1', name: 'S3 Storage', type: 's3' }),
        createMockStorage({ id: 'storage-2', name: 'Local Storage', type: 'local' }),
      ];
      mockClient.mocks.getStorages.mockResolvedValue(storages);

      const tool = mockServer.tools.get('databasus_list_storages');
      const result = await tool!.handler({});

      expect(mockClient.mocks.getStorages).toHaveBeenCalledTimes(1);
      const response = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(response).toHaveLength(2);
      expect(response[0]).toEqual({
        id: 'storage-1',
        name: 'S3 Storage',
        type: 's3',
        enabled: true,
      });
      expect(response[1]).toEqual({
        id: 'storage-2',
        name: 'Local Storage',
        type: 'local',
        enabled: true,
      });
    });

    it('should return empty array when no storages exist', async () => {
      mockClient.mocks.getStorages.mockResolvedValue([]);

      const tool = mockServer.tools.get('databasus_list_storages');
      const result = await tool!.handler({});

      const response = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(response).toEqual([]);
    });

    it('should handle error when listing storages fails', async () => {
      mockClient.mocks.getStorages.mockRejectedValue(new Error('Connection failed'));

      const tool = mockServer.tools.get('databasus_list_storages');
      const result = await tool!.handler({});

      const response = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(response).toEqual({ error: 'Connection failed' });
    });

    it('should handle unknown error type', async () => {
      mockClient.mocks.getStorages.mockRejectedValue('string error');

      const tool = mockServer.tools.get('databasus_list_storages');
      const result = await tool!.handler({});

      const response = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(response).toEqual({ error: 'Unknown error' });
    });
  });

  describe('databasus_get_storage', () => {
    it('should get a specific storage by id', async () => {
      const storage = createMockStorage();
      mockClient.mocks.getStorage.mockResolvedValue(storage);

      const tool = mockServer.tools.get('databasus_get_storage');
      const result = await tool!.handler({ id: 'storage-123' });

      expect(mockClient.mocks.getStorage).toHaveBeenCalledWith('storage-123');
      const response = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(response.id).toBe('storage-123');
      expect(response.name).toBe('Test Storage');
      expect(response.type).toBe('s3');
    });

    it('should mask sensitive config values in storage details', async () => {
      const storage = createMockStorage({
        config: {
          bucket: 'my-bucket',
          region: 'us-east-1',
          accessKey: 'AKIAIOSFODNN7EXAMPLE',
          secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          apiKey: 'my-api-key-12345',
          password: 'super-secret-password',
          token: 'bearer-token-xyz',
          credential: 'my-credentials',
          nonSensitive: 'this-is-safe',
        },
      });
      mockClient.mocks.getStorage.mockResolvedValue(storage);

      const tool = mockServer.tools.get('databasus_get_storage');
      const result = await tool!.handler({ id: 'storage-123' });

      const response = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(response.config.accessKey).toBe('***');
      expect(response.config.secretKey).toBe('***');
      expect(response.config.apiKey).toBe('***');
      expect(response.config.password).toBe('***');
      expect(response.config.token).toBe('***');
      expect(response.config.credential).toBe('***');
      expect(response.config.bucket).toBe('my-bucket');
      expect(response.config.region).toBe('us-east-1');
      expect(response.config.nonSensitive).toBe('this-is-safe');
    });

    it('should mask nested sensitive config values', async () => {
      const storage = createMockStorage({
        config: {
          connection: {
            host: 's3.amazonaws.com',
            secret: 'nested-secret-value',
            nested: {
              apiKey: 'deeply-nested-key',
            },
          },
          regular: 'visible',
        },
      });
      mockClient.mocks.getStorage.mockResolvedValue(storage);

      const tool = mockServer.tools.get('databasus_get_storage');
      const result = await tool!.handler({ id: 'storage-123' });

      const response = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(response.config.connection.host).toBe('s3.amazonaws.com');
      expect(response.config.connection.secret).toBe('***');
      expect(response.config.connection.nested.apiKey).toBe('***');
      expect(response.config.regular).toBe('visible');
    });

    it('should mask keys containing sensitive substrings', async () => {
      const storage = createMockStorage({
        config: {
          my_access_key: 'should-be-masked',
          secret_token: 'should-be-masked',
          password_hash: 'should-be-masked',
          normal_field: 'should-be-visible',
        },
      });
      mockClient.mocks.getStorage.mockResolvedValue(storage);

      const tool = mockServer.tools.get('databasus_get_storage');
      const result = await tool!.handler({ id: 'storage-123' });

      const response = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(response.config.my_access_key).toBe('***');
      expect(response.config.secret_token).toBe('***');
      expect(response.config.password_hash).toBe('***');
      expect(response.config.normal_field).toBe('should-be-visible');
    });

    it('should handle error when storage not found', async () => {
      mockClient.mocks.getStorage.mockRejectedValue(new Error('Storage not found'));

      const tool = mockServer.tools.get('databasus_get_storage');
      const result = await tool!.handler({ id: 'non-existent' });

      const response = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(response).toEqual({ error: 'Storage not found' });
    });
  });

  describe('databasus_create_storage', () => {
    it('should create a storage successfully', async () => {
      const newStorage = createMockStorage();
      mockClient.mocks.createStorage.mockResolvedValue(newStorage);

      const tool = mockServer.tools.get('databasus_create_storage');
      const result = await tool!.handler({
        name: 'Test Storage',
        type: 's3',
        config: {
          bucket: 'my-bucket',
          region: 'us-east-1',
          accessKey: 'AKIAIOSFODNN7EXAMPLE',
          secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        },
      });

      expect(mockClient.mocks.createStorage).toHaveBeenCalledWith({
        name: 'Test Storage',
        type: 's3',
        config: {
          bucket: 'my-bucket',
          region: 'us-east-1',
          accessKey: 'AKIAIOSFODNN7EXAMPLE',
          secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        },
      });
      const response = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(response.id).toBe('storage-123');
      expect(response.name).toBe('Test Storage');
    });

    it('should mask sensitive values in created storage response', async () => {
      const newStorage = createMockStorage({
        config: {
          bucket: 'my-bucket',
          secretKey: 'super-secret',
        },
      });
      mockClient.mocks.createStorage.mockResolvedValue(newStorage);

      const tool = mockServer.tools.get('databasus_create_storage');
      const result = await tool!.handler({
        name: 'Test Storage',
        type: 's3',
        config: { bucket: 'my-bucket', secretKey: 'super-secret' },
      });

      const response = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(response.config.secretKey).toBe('***');
      expect(response.config.bucket).toBe('my-bucket');
    });

    it('should support all storage types', async () => {
      const storageTypes = ['local', 's3', 'google_drive', 'dropbox', 'sftp', 'ftp', 'rclone', 'azure_blob', 'gcs'] as const;

      for (const type of storageTypes) {
        mockClient.mocks.createStorage.mockResolvedValue(createMockStorage({ type }));

        const tool = mockServer.tools.get('databasus_create_storage');
        const result = await tool!.handler({
          name: `${type} Storage`,
          type,
          config: { path: '/backups' },
        });

        const response = JSON.parse((result as { content: { text: string }[] }).content[0].text);
        expect(response.type).toBe(type);
      }
    });

    it('should handle error when creation fails', async () => {
      mockClient.mocks.createStorage.mockRejectedValue(new Error('Invalid configuration'));

      const tool = mockServer.tools.get('databasus_create_storage');
      const result = await tool!.handler({
        name: 'Test Storage',
        type: 's3',
        config: { bucket: '' },
      });

      const response = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(response).toEqual({ error: 'Invalid configuration' });
    });
  });

  describe('databasus_update_storage', () => {
    it('should update storage name', async () => {
      const updatedStorage = createMockStorage({ name: 'Updated Storage' });
      mockClient.mocks.updateStorage.mockResolvedValue(updatedStorage);

      const tool = mockServer.tools.get('databasus_update_storage');
      const result = await tool!.handler({
        id: 'storage-123',
        name: 'Updated Storage',
      });

      expect(mockClient.mocks.updateStorage).toHaveBeenCalledWith('storage-123', {
        name: 'Updated Storage',
        enabled: undefined,
        config: undefined,
      });
      const response = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(response.name).toBe('Updated Storage');
    });

    it('should update storage enabled status', async () => {
      const updatedStorage = createMockStorage({ enabled: false });
      mockClient.mocks.updateStorage.mockResolvedValue(updatedStorage);

      const tool = mockServer.tools.get('databasus_update_storage');
      const result = await tool!.handler({
        id: 'storage-123',
        enabled: false,
      });

      expect(mockClient.mocks.updateStorage).toHaveBeenCalledWith('storage-123', {
        name: undefined,
        enabled: false,
        config: undefined,
      });
      const response = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(response.enabled).toBe(false);
    });

    it('should update storage config', async () => {
      const updatedStorage = createMockStorage({
        config: { bucket: 'new-bucket', region: 'eu-west-1' },
      });
      mockClient.mocks.updateStorage.mockResolvedValue(updatedStorage);

      const tool = mockServer.tools.get('databasus_update_storage');
      const result = await tool!.handler({
        id: 'storage-123',
        config: { bucket: 'new-bucket', region: 'eu-west-1' },
      });

      expect(mockClient.mocks.updateStorage).toHaveBeenCalledWith('storage-123', {
        name: undefined,
        enabled: undefined,
        config: { bucket: 'new-bucket', region: 'eu-west-1' },
      });
      const response = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(response.config.bucket).toBe('new-bucket');
    });

    it('should mask sensitive values in updated storage response', async () => {
      const updatedStorage = createMockStorage({
        config: {
          bucket: 'new-bucket',
          accessKey: 'NEW_ACCESS_KEY',
          secretKey: 'NEW_SECRET_KEY',
        },
      });
      mockClient.mocks.updateStorage.mockResolvedValue(updatedStorage);

      const tool = mockServer.tools.get('databasus_update_storage');
      const result = await tool!.handler({
        id: 'storage-123',
        config: { bucket: 'new-bucket' },
      });

      const response = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(response.config.accessKey).toBe('***');
      expect(response.config.secretKey).toBe('***');
      expect(response.config.bucket).toBe('new-bucket');
    });

    it('should update multiple fields at once', async () => {
      const updatedStorage = createMockStorage({
        name: 'Updated Storage',
        enabled: false,
        config: { bucket: 'new-bucket' },
      });
      mockClient.mocks.updateStorage.mockResolvedValue(updatedStorage);

      const tool = mockServer.tools.get('databasus_update_storage');
      const result = await tool!.handler({
        id: 'storage-123',
        name: 'Updated Storage',
        enabled: false,
        config: { bucket: 'new-bucket' },
      });

      expect(mockClient.mocks.updateStorage).toHaveBeenCalledWith('storage-123', {
        name: 'Updated Storage',
        enabled: false,
        config: { bucket: 'new-bucket' },
      });
      const response = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(response.name).toBe('Updated Storage');
      expect(response.enabled).toBe(false);
    });

    it('should handle error when update fails', async () => {
      mockClient.mocks.updateStorage.mockRejectedValue(new Error('Update failed'));

      const tool = mockServer.tools.get('databasus_update_storage');
      const result = await tool!.handler({
        id: 'storage-123',
        name: 'Updated Storage',
      });

      const response = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(response).toEqual({ error: 'Update failed' });
    });
  });

  describe('databasus_delete_storage', () => {
    it('should delete storage successfully', async () => {
      mockClient.mocks.deleteStorage.mockResolvedValue(undefined);

      const tool = mockServer.tools.get('databasus_delete_storage');
      const result = await tool!.handler({ id: 'storage-123' });

      expect(mockClient.mocks.deleteStorage).toHaveBeenCalledWith('storage-123');
      const response = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(response).toEqual({
        success: true,
        message: 'Storage storage-123 deleted successfully',
      });
    });

    it('should handle error when deletion fails', async () => {
      mockClient.mocks.deleteStorage.mockRejectedValue(new Error('Storage in use'));

      const tool = mockServer.tools.get('databasus_delete_storage');
      const result = await tool!.handler({ id: 'storage-123' });

      const response = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(response).toEqual({ error: 'Storage in use' });
    });

    it('should handle not found error', async () => {
      mockClient.mocks.deleteStorage.mockRejectedValue(new Error('Storage not found'));

      const tool = mockServer.tools.get('databasus_delete_storage');
      const result = await tool!.handler({ id: 'non-existent' });

      const response = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(response).toEqual({ error: 'Storage not found' });
    });
  });

  describe('databasus_test_storage', () => {
    it('should test storage connection successfully', async () => {
      mockClient.mocks.testStorage.mockResolvedValue({
        success: true,
        message: 'Connection successful',
      });

      const tool = mockServer.tools.get('databasus_test_storage');
      const result = await tool!.handler({ id: 'storage-123' });

      expect(mockClient.mocks.testStorage).toHaveBeenCalledWith('storage-123');
      const response = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(response).toEqual({ success: true, message: 'Connection successful' });
    });

    it('should handle test failure from API', async () => {
      mockClient.mocks.testStorage.mockResolvedValue({
        success: false,
        message: 'Invalid credentials',
      });

      const tool = mockServer.tools.get('databasus_test_storage');
      const result = await tool!.handler({ id: 'storage-123' });

      const response = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(response).toEqual({ success: false, message: 'Invalid credentials' });
    });

    it('should handle error when test fails unexpectedly', async () => {
      mockClient.mocks.testStorage.mockRejectedValue(new Error('Network timeout'));

      const tool = mockServer.tools.get('databasus_test_storage');
      const result = await tool!.handler({ id: 'storage-123' });

      const response = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(response).toEqual({ success: false, error: 'Network timeout' });
    });

    it('should handle unknown error type in test', async () => {
      mockClient.mocks.testStorage.mockRejectedValue(null);

      const tool = mockServer.tools.get('databasus_test_storage');
      const result = await tool!.handler({ id: 'storage-123' });

      const response = JSON.parse((result as { content: { text: string }[] }).content[0].text);
      expect(response).toEqual({ success: false, error: 'Unknown error' });
    });
  });

  describe('tool registration', () => {
    it('should register all six storage tools', () => {
      expect(mockServer.tools.has('databasus_list_storages')).toBe(true);
      expect(mockServer.tools.has('databasus_get_storage')).toBe(true);
      expect(mockServer.tools.has('databasus_create_storage')).toBe(true);
      expect(mockServer.tools.has('databasus_update_storage')).toBe(true);
      expect(mockServer.tools.has('databasus_delete_storage')).toBe(true);
      expect(mockServer.tools.has('databasus_test_storage')).toBe(true);
      expect(mockServer.tools.size).toBe(6);
    });

    it('should call server.tool for each storage tool', () => {
      expect(mockServer.server.tool).toHaveBeenCalledTimes(6);
    });
  });

  describe('response format', () => {
    it('should return content as array with text type', async () => {
      mockClient.mocks.getStorages.mockResolvedValue([createMockStorage()]);

      const tool = mockServer.tools.get('databasus_list_storages');
      const result = await tool!.handler({});

      expect(result).toHaveProperty('content');
      expect((result as { content: unknown[] }).content).toBeInstanceOf(Array);
      expect((result as { content: { type: string }[] }).content[0].type).toBe('text');
    });

    it('should return valid JSON in text content', async () => {
      mockClient.mocks.getStorages.mockResolvedValue([createMockStorage()]);

      const tool = mockServer.tools.get('databasus_list_storages');
      const result = await tool!.handler({});

      const text = (result as { content: { text: string }[] }).content[0].text;
      expect(() => JSON.parse(text)).not.toThrow();
    });

    it('should format JSON with indentation', async () => {
      mockClient.mocks.getStorage.mockResolvedValue(createMockStorage());

      const tool = mockServer.tools.get('databasus_get_storage');
      const result = await tool!.handler({ id: 'storage-123' });

      const text = (result as { content: { text: string }[] }).content[0].text;
      expect(text).toContain('\n');
      expect(text).toContain('  ');
    });
  });
});