import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DatabasusClient } from '../../client.js';
import { registerNotifierTools } from '../../tools/notifiers.js';
import type { Notifier } from '../../types.js';

interface MockToolHandler {
  name: string;
  description: string;
  paramsSchema: Record<string, unknown>;
  handler: (params: Record<string, unknown>) => Promise<unknown>;
}

describe('Notifier Tools', () => {
  let mockServer: { tool: Mock };
  let mockClient: {
    getNotifiers: Mock;
    getNotifier: Mock;
    createNotifier: Mock;
    updateNotifier: Mock;
    deleteNotifier: Mock;
    testNotifier: Mock;
  };
  let registeredTools: MockToolHandler[];

  const mockNotifier: Notifier = {
    id: 'notifier-1',
    name: 'Test Slack Notifier',
    type: 'slack',
    enabled: true,
    config: {
      webhook_url: 'https://hooks.slack.com/services/xxx/yyy/zzz',
      channel: '#alerts',
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockNotifierWithEmail: Notifier = {
    id: 'notifier-2',
    name: 'Email Notifier',
    type: 'email',
    enabled: true,
    config: {
      host: 'smtp.example.com',
      port: 587,
      username: 'user@example.com',
      password: 'secret-password',
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    registeredTools = [];
    
    mockServer = {
      tool: vi.fn((name: string, description: string, paramsSchema: Record<string, unknown>, handler: (params: Record<string, unknown>) => Promise<unknown>) => {
        registeredTools.push({ name, description, paramsSchema, handler });
      }),
    };

    mockClient = {
      getNotifiers: vi.fn(),
      getNotifier: vi.fn(),
      createNotifier: vi.fn(),
      updateNotifier: vi.fn(),
      deleteNotifier: vi.fn(),
      testNotifier: vi.fn(),
    };

    registerNotifierTools(mockServer as unknown as McpServer, mockClient as unknown as DatabasusClient);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Tool Registration', () => {
    it('should register all 6 notifier tools', () => {
      expect(registeredTools).toHaveLength(6);
      expect(registeredTools.map(t => t.name)).toEqual([
        'databasus_list_notifiers',
        'databasus_get_notifier',
        'databasus_create_notifier',
        'databasus_update_notifier',
        'databasus_delete_notifier',
        'databasus_test_notifier',
      ]);
    });

    it('should have descriptions for all tools', () => {
      registeredTools.forEach(tool => {
        expect(tool.description).toBeTruthy();
        expect(typeof tool.description).toBe('string');
      });
    });
  });

  describe('databasus_list_notifiers', () => {
    const toolName = 'databasus_list_notifiers';
    
    const getTool = () => registeredTools.find(t => t.name === toolName)!;

    it('should list all notifiers', async () => {
      mockClient.getNotifiers.mockResolvedValue([mockNotifier, mockNotifierWithEmail]);

      const result = await getTool().handler({});

      expect(mockClient.getNotifiers).toHaveBeenCalledOnce();
      const response = JSON.parse(result.content[0].text);
      expect(response).toEqual([
        { id: 'notifier-1', name: 'Test Slack Notifier', type: 'slack', enabled: true },
        { id: 'notifier-2', name: 'Email Notifier', type: 'email', enabled: true },
      ]);
    });

    it('should return empty array when no notifiers', async () => {
      mockClient.getNotifiers.mockResolvedValue([]);

      const result = await getTool().handler({});

      const response = JSON.parse(result.content[0].text);
      expect(response).toEqual([]);
    });

    it('should handle errors', async () => {
      mockClient.getNotifiers.mockRejectedValue(new Error('Failed to fetch notifiers'));

      const result = await getTool().handler({});

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Failed to fetch notifiers');
    });
  });

  describe('databasus_get_notifier', () => {
    const toolName = 'databasus_get_notifier';
    
    const getTool = () => registeredTools.find(t => t.name === toolName)!;

    it('should get a specific notifier with masked sensitive values', async () => {
      mockClient.getNotifier.mockResolvedValue(mockNotifier);

      const result = await getTool().handler({ id: 'notifier-1' });

      expect(mockClient.getNotifier).toHaveBeenCalledWith('notifier-1');
      const response = JSON.parse(result.content[0].text);
      expect(response.config.webhook_url).toBe('***REDACTED***');
      expect(response.config.channel).toBe('#alerts');
    });

    it('should mask password in email notifier config', async () => {
      mockClient.getNotifier.mockResolvedValue(mockNotifierWithEmail);

      const result = await getTool().handler({ id: 'notifier-2' });

      const response = JSON.parse(result.content[0].text);
      expect(response.config.password).toBe('***REDACTED***');
      expect(response.config.host).toBe('smtp.example.com');
    });

    it('should handle not found error', async () => {
      mockClient.getNotifier.mockRejectedValue(new Error('Notifier not found'));

      const result = await getTool().handler({ id: 'non-existent' });

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Notifier not found');
    });
  });

  describe('databasus_create_notifier', () => {
    const toolName = 'databasus_create_notifier';
    
    const getTool = () => registeredTools.find(t => t.name === toolName)!;

    it('should create a slack notifier', async () => {
      mockClient.createNotifier.mockResolvedValue(mockNotifier);

      const result = await getTool().handler({
        name: 'Test Slack Notifier',
        type: 'slack',
        config: { webhook_url: 'https://hooks.slack.com/services/xxx', channel: '#alerts' },
      });

      expect(mockClient.createNotifier).toHaveBeenCalledWith({
        name: 'Test Slack Notifier',
        type: 'slack',
        config: { webhook_url: 'https://hooks.slack.com/services/xxx', channel: '#alerts' },
      });
      const response = JSON.parse(result.content[0].text);
      expect(response.config.webhook_url).toBe('***REDACTED***');
    });

    it('should create an email notifier', async () => {
      mockClient.createNotifier.mockResolvedValue(mockNotifierWithEmail);

      const result = await getTool().handler({
        name: 'Email Notifier',
        type: 'email',
        config: { host: 'smtp.example.com', port: 587 },
      });

      expect(mockClient.createNotifier).toHaveBeenCalled();
      const response = JSON.parse(result.content[0].text);
      expect(response.type).toBe('email');
    });

    it('should create a discord notifier', async () => {
      const discordNotifier: Notifier = {
        id: 'notifier-3',
        name: 'Discord Notifier',
        type: 'discord',
        enabled: true,
        config: { webhook_url: 'https://discord.com/api/webhooks/xxx' },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      mockClient.createNotifier.mockResolvedValue(discordNotifier);

      const result = await getTool().handler({
        name: 'Discord Notifier',
        type: 'discord',
        config: { webhook_url: 'https://discord.com/api/webhooks/xxx' },
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.type).toBe('discord');
      expect(response.config.webhook_url).toBe('***REDACTED***');
    });

    it('should create a telegram notifier', async () => {
      const telegramNotifier: Notifier = {
        id: 'notifier-4',
        name: 'Telegram Notifier',
        type: 'telegram',
        enabled: true,
        config: { bot_token: '123456:ABC-DEF', chat_id: '-1001234567890' },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      mockClient.createNotifier.mockResolvedValue(telegramNotifier);

      const result = await getTool().handler({
        name: 'Telegram Notifier',
        type: 'telegram',
        config: { bot_token: '123456:ABC-DEF', chat_id: '-1001234567890' },
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.type).toBe('telegram');
      expect(response.config.bot_token).toBe('***REDACTED***');
    });

    it('should create a webhook notifier', async () => {
      const webhookNotifier: Notifier = {
        id: 'notifier-5',
        name: 'Webhook Notifier',
        type: 'webhook',
        enabled: true,
        config: { url: 'https://example.com/webhook', method: 'POST' },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      mockClient.createNotifier.mockResolvedValue(webhookNotifier);

      const result = await getTool().handler({
        name: 'Webhook Notifier',
        type: 'webhook',
        config: { url: 'https://example.com/webhook', method: 'POST' },
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.type).toBe('webhook');
      expect(response.config.url).toBe('***REDACTED***');
    });

    it('should handle creation errors', async () => {
      mockClient.createNotifier.mockRejectedValue(new Error('Invalid config'));

      const result = await getTool().handler({
        name: 'Invalid Notifier',
        type: 'slack',
        config: {},
      });

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Invalid config');
    });
  });

  describe('databasus_update_notifier', () => {
    const toolName = 'databasus_update_notifier';
    
    const getTool = () => registeredTools.find(t => t.name === toolName)!;

    it('should update notifier name', async () => {
      const updatedNotifier = { ...mockNotifier, name: 'Updated Name' };
      mockClient.updateNotifier.mockResolvedValue(updatedNotifier);

      const result = await getTool().handler({ id: 'notifier-1', name: 'Updated Name' });

      expect(mockClient.updateNotifier).toHaveBeenCalledWith('notifier-1', { name: 'Updated Name' });
      const response = JSON.parse(result.content[0].text);
      expect(response.name).toBe('Updated Name');
    });

    it('should update enabled status', async () => {
      const updatedNotifier = { ...mockNotifier, enabled: false };
      mockClient.updateNotifier.mockResolvedValue(updatedNotifier);

      const result = await getTool().handler({ id: 'notifier-1', enabled: false });

      expect(mockClient.updateNotifier).toHaveBeenCalledWith('notifier-1', { enabled: false });
      const response = JSON.parse(result.content[0].text);
      expect(response.enabled).toBe(false);
    });

    it('should update config', async () => {
      const updatedNotifier = { ...mockNotifier, config: { webhook_url: 'https://new.url', channel: '#new-channel' } };
      mockClient.updateNotifier.mockResolvedValue(updatedNotifier);

      const result = await getTool().handler({ id: 'notifier-1', config: { webhook_url: 'https://new.url', channel: '#new-channel' } });

      expect(mockClient.updateNotifier).toHaveBeenCalledWith('notifier-1', { config: { webhook_url: 'https://new.url', channel: '#new-channel' } });
      const response = JSON.parse(result.content[0].text);
      expect(response.config.webhook_url).toBe('***REDACTED***');
      expect(response.config.channel).toBe('#new-channel');
    });

    it('should handle update errors', async () => {
      mockClient.updateNotifier.mockRejectedValue(new Error('Update failed'));

      const result = await getTool().handler({ id: 'notifier-1', name: 'New Name' });

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Update failed');
    });
  });

  describe('databasus_delete_notifier', () => {
    const toolName = 'databasus_delete_notifier';
    
    const getTool = () => registeredTools.find(t => t.name === toolName)!;

    it('should delete a notifier', async () => {
      mockClient.deleteNotifier.mockResolvedValue(undefined);

      const result = await getTool().handler({ id: 'notifier-1' });

      expect(mockClient.deleteNotifier).toHaveBeenCalledWith('notifier-1');
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.message).toContain('notifier-1');
    });

    it('should handle not found error', async () => {
      mockClient.deleteNotifier.mockRejectedValue(new Error('Notifier not found'));

      const result = await getTool().handler({ id: 'non-existent' });

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Notifier not found');
    });

    it('should handle in-use error', async () => {
      mockClient.deleteNotifier.mockRejectedValue(new Error('Notifier is in use by database'));

      const result = await getTool().handler({ id: 'notifier-1' });

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Notifier is in use by database');
    });
  });

  describe('databasus_test_notifier', () => {
    const toolName = 'databasus_test_notifier';
    
    const getTool = () => registeredTools.find(t => t.name === toolName)!;

    it('should test notifier successfully', async () => {
      mockClient.testNotifier.mockResolvedValue({ success: true, message: 'Test notification sent' });

      const result = await getTool().handler({ id: 'notifier-1' });

      expect(mockClient.testNotifier).toHaveBeenCalledWith('notifier-1');
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.message).toBe('Test notification sent');
    });

    it('should handle test failure', async () => {
      mockClient.testNotifier.mockResolvedValue({ success: false, message: 'Connection failed' });

      const result = await getTool().handler({ id: 'notifier-1' });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.message).toBe('Connection failed');
    });

    it('should handle test errors', async () => {
      mockClient.testNotifier.mockRejectedValue(new Error('Network error'));

      const result = await getTool().handler({ id: 'notifier-1' });

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toBe('Network error');
    });
  });

  describe('Sensitive Config Masking', () => {
    it('should mask webhook_url', async () => {
      const notifier: Notifier = {
        id: 'n1',
        name: 'Test',
        type: 'slack',
        enabled: true,
        config: { webhook_url: 'secret' },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      mockClient.getNotifier.mockResolvedValue(notifier);

      const tool = registeredTools.find(t => t.name === 'databasus_get_notifier')!;
      const result = await tool.handler({ id: 'n1' });
      const response = JSON.parse(result.content[0].text);
      expect(response.config.webhook_url).toBe('***REDACTED***');
    });

    it('should mask password', async () => {
      const notifier: Notifier = {
        id: 'n1',
        name: 'Test',
        type: 'email',
        enabled: true,
        config: { password: 'secret123' },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      mockClient.getNotifier.mockResolvedValue(notifier);

      const tool = registeredTools.find(t => t.name === 'databasus_get_notifier')!;
      const result = await tool.handler({ id: 'n1' });
      const response = JSON.parse(result.content[0].text);
      expect(response.config.password).toBe('***REDACTED***');
    });

    it('should mask bot_token', async () => {
      const notifier: Notifier = {
        id: 'n1',
        name: 'Test',
        type: 'telegram',
        enabled: true,
        config: { bot_token: 'secret-token' },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      mockClient.getNotifier.mockResolvedValue(notifier);

      const tool = registeredTools.find(t => t.name === 'databasus_get_notifier')!;
      const result = await tool.handler({ id: 'n1' });
      const response = JSON.parse(result.content[0].text);
      expect(response.config.bot_token).toBe('***REDACTED***');
    });

    it('should mask access_token', async () => {
      const notifier: Notifier = {
        id: 'n1',
        name: 'Test',
        type: 'webhook',
        enabled: true,
        config: { access_token: 'secret-access-token' },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      mockClient.getNotifier.mockResolvedValue(notifier);

      const tool = registeredTools.find(t => t.name === 'databasus_get_notifier')!;
      const result = await tool.handler({ id: 'n1' });
      const response = JSON.parse(result.content[0].text);
      expect(response.config.access_token).toBe('***REDACTED***');
    });

    it('should mask url', async () => {
      const notifier: Notifier = {
        id: 'n1',
        name: 'Test',
        type: 'webhook',
        enabled: true,
        config: { url: 'https://secret.url/webhook' },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      mockClient.getNotifier.mockResolvedValue(notifier);

      const tool = registeredTools.find(t => t.name === 'databasus_get_notifier')!;
      const result = await tool.handler({ id: 'n1' });
      const response = JSON.parse(result.content[0].text);
      expect(response.config.url).toBe('***REDACTED***');
    });

    it('should mask webhookUrl (camelCase)', async () => {
      const notifier: Notifier = {
        id: 'n1',
        name: 'Test',
        type: 'slack',
        enabled: true,
        config: { webhookUrl: 'https://secret.webhook' },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      mockClient.getNotifier.mockResolvedValue(notifier);

      const tool = registeredTools.find(t => t.name === 'databasus_get_notifier')!;
      const result = await tool.handler({ id: 'n1' });
      const response = JSON.parse(result.content[0].text);
      expect(response.config.webhookUrl).toBe('***REDACTED***');
    });

    it('should mask botToken (camelCase)', async () => {
      const notifier: Notifier = {
        id: 'n1',
        name: 'Test',
        type: 'telegram',
        enabled: true,
        config: { botToken: 'secret-bot-token' },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      mockClient.getNotifier.mockResolvedValue(notifier);

      const tool = registeredTools.find(t => t.name === 'databasus_get_notifier')!;
      const result = await tool.handler({ id: 'n1' });
      const response = JSON.parse(result.content[0].text);
      expect(response.config.botToken).toBe('***REDACTED***');
    });

    it('should mask accessToken (camelCase)', async () => {
      const notifier: Notifier = {
        id: 'n1',
        name: 'Test',
        type: 'webhook',
        enabled: true,
        config: { accessToken: 'secret-access-token' },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      mockClient.getNotifier.mockResolvedValue(notifier);

      const tool = registeredTools.find(t => t.name === 'databasus_get_notifier')!;
      const result = await tool.handler({ id: 'n1' });
      const response = JSON.parse(result.content[0].text);
      expect(response.config.accessToken).toBe('***REDACTED***');
    });

    it('should not mask non-string values', async () => {
      const notifier: Notifier = {
        id: 'n1',
        name: 'Test',
        type: 'email',
        enabled: true,
        config: { port: 587, secure: true },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      mockClient.getNotifier.mockResolvedValue(notifier);

      const tool = registeredTools.find(t => t.name === 'databasus_get_notifier')!;
      const result = await tool.handler({ id: 'n1' });
      const response = JSON.parse(result.content[0].text);
      expect(response.config.port).toBe(587);
      expect(response.config.secure).toBe(true);
    });

    it('should not mask non-sensitive string values', async () => {
      const notifier: Notifier = {
        id: 'n1',
        name: 'Test',
        type: 'email',
        enabled: true,
        config: { host: 'smtp.example.com', username: 'user@example.com' },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      mockClient.getNotifier.mockResolvedValue(notifier);

      const tool = registeredTools.find(t => t.name === 'databasus_get_notifier')!;
      const result = await tool.handler({ id: 'n1' });
      const response = JSON.parse(result.content[0].text);
      expect(response.config.host).toBe('smtp.example.com');
      expect(response.config.username).toBe('user@example.com');
    });
  });

  describe('Tool Parameter Schemas', () => {
    it('databasus_get_notifier should have id parameter', () => {
      const tool = registeredTools.find(t => t.name === 'databasus_get_notifier')!;
      expect(tool.paramsSchema).toHaveProperty('id');
    });

    it('databasus_create_notifier should have name, type, and config parameters', () => {
      const tool = registeredTools.find(t => t.name === 'databasus_create_notifier')!;
      expect(tool.paramsSchema).toHaveProperty('name');
      expect(tool.paramsSchema).toHaveProperty('type');
      expect(tool.paramsSchema).toHaveProperty('config');
    });

    it('databasus_update_notifier should have optional parameters', () => {
      const tool = registeredTools.find(t => t.name === 'databasus_update_notifier')!;
      expect(tool.paramsSchema).toHaveProperty('id');
      expect(tool.paramsSchema).toHaveProperty('name');
      expect(tool.paramsSchema).toHaveProperty('enabled');
      expect(tool.paramsSchema).toHaveProperty('config');
    });

    it('databasus_delete_notifier should have id parameter', () => {
      const tool = registeredTools.find(t => t.name === 'databasus_delete_notifier')!;
      expect(tool.paramsSchema).toHaveProperty('id');
    });

    it('databasus_test_notifier should have id parameter', () => {
      const tool = registeredTools.find(t => t.name === 'databasus_test_notifier')!;
      expect(tool.paramsSchema).toHaveProperty('id');
    });
  });
});
