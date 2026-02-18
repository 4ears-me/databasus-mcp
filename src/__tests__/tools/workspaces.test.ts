import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DatabasusClient } from '../../client.js';
import { registerWorkspaceTools } from '../../tools/workspaces.js';
import type { Workspace, HealthCheck, DatabaseStats } from '../../types.js';

type ToolHandler = (...args: unknown[]) => Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}>;

interface MockServer {
  tool: Mock;
}

interface MockClient {
  getWorkspaces: Mock;
  getWorkspace: Mock;
  getHealthChecks: Mock;
  getLatestHealthCheck: Mock;
  getStats: Mock;
}

describe('Workspace Tools', () => {
  let mockServer: MockServer;
  let mockClient: MockClient;
  let toolHandlers: Map<string, ToolHandler>;

  beforeEach(() => {
    toolHandlers = new Map();
    
    mockServer = {
      tool: vi.fn((name: string, _description: string, _schema: unknown, handler: ToolHandler) => {
        toolHandlers.set(name, handler);
      }),
    };

    mockClient = {
      getWorkspaces: vi.fn(),
      getWorkspace: vi.fn(),
      getHealthChecks: vi.fn(),
      getLatestHealthCheck: vi.fn(),
      getStats: vi.fn(),
    };

    registerWorkspaceTools(mockServer as unknown as McpServer, mockClient as unknown as DatabasusClient);
  });

  describe('databasus_list_workspaces', () => {
    const toolName = 'databasus_list_workspaces';
    const mockWorkspaces: Workspace[] = [
      {
        id: 'workspace-1',
        name: 'Production',
        description: 'Production databases',
        memberCount: 5,
        databaseCount: 10,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'workspace-2',
        name: 'Development',
        description: 'Development databases',
        memberCount: 3,
        databaseCount: 5,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    it('should list all workspaces', async () => {
      mockClient.getWorkspaces.mockResolvedValue(mockWorkspaces);

      const handler = toolHandlers.get(toolName)!;
      const result = await handler({});

      expect(mockClient.getWorkspaces).toHaveBeenCalledOnce();
      const response = JSON.parse(result.content[0].text);
      expect(response).toEqual([
        { id: 'workspace-1', name: 'Production', description: 'Production databases', memberCount: 5, databaseCount: 10 },
        { id: 'workspace-2', name: 'Development', description: 'Development databases', memberCount: 3, databaseCount: 5 },
      ]);
    });

    it('should return empty array when no workspaces', async () => {
      mockClient.getWorkspaces.mockResolvedValue([]);

      const handler = toolHandlers.get(toolName)!;
      const result = await handler({});

      const response = JSON.parse(result.content[0].text);
      expect(response).toEqual([]);
    });

    it('should handle client errors', async () => {
      mockClient.getWorkspaces.mockRejectedValue(new Error('Failed to fetch workspaces'));

      const handler = toolHandlers.get(toolName)!;
      const result = await handler({});

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Failed to fetch workspaces');
    });

    it('should handle non-Error thrown', async () => {
      mockClient.getWorkspaces.mockRejectedValue('String error');

      const handler = toolHandlers.get(toolName)!;
      const result = await handler({});

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Unknown error');
    });

    it('should handle workspace without description', async () => {
      const workspaceNoDesc: Workspace[] = [
        {
          id: 'workspace-1',
          name: 'No Description',
          description: undefined as unknown as string,
          memberCount: 1,
          databaseCount: 1,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ];
      mockClient.getWorkspaces.mockResolvedValue(workspaceNoDesc);

      const handler = toolHandlers.get(toolName)!;
      const result = await handler({});

      const response = JSON.parse(result.content[0].text);
      expect(response[0].name).toBe('No Description');
    });
  });

  describe('databasus_get_workspace', () => {
    const toolName = 'databasus_get_workspace';
    const mockWorkspace: Workspace = {
      id: 'workspace-1',
      name: 'Production',
      description: 'Production databases',
      memberCount: 5,
      databaseCount: 10,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    it('should get a specific workspace', async () => {
      mockClient.getWorkspace.mockResolvedValue(mockWorkspace);

      const handler = toolHandlers.get(toolName)!;
      const result = await handler({ id: 'workspace-1' });

      expect(mockClient.getWorkspace).toHaveBeenCalledWith('workspace-1');
      const response = JSON.parse(result.content[0].text);
      expect(response).toEqual(mockWorkspace);
    });

    it('should handle not found error', async () => {
      mockClient.getWorkspace.mockRejectedValue(new Error('Workspace not found'));

      const handler = toolHandlers.get(toolName)!;
      const result = await handler({ id: 'non-existent' });

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Workspace not found');
    });

    it('should handle network error', async () => {
      mockClient.getWorkspace.mockRejectedValue(new Error('Network error'));

      const handler = toolHandlers.get(toolName)!;
      const result = await handler({ id: 'workspace-1' });

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Network error');
    });

    it('should handle unauthorized error', async () => {
      mockClient.getWorkspace.mockRejectedValue(new Error('Unauthorized'));

      const handler = toolHandlers.get(toolName)!;
      const result = await handler({ id: 'workspace-1' });

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Unauthorized');
    });
  });

  describe('databasus_get_health_checks', () => {
    const toolName = 'databasus_get_health_checks';
    const mockHealthChecks: HealthCheck[] = [
      {
        id: 'hc-1',
        databaseId: 'db-1',
        status: 'healthy',
        responseTimeMs: 15,
        checkedAt: '2024-01-01T10:00:00.000Z',
      },
      {
        id: 'hc-2',
        databaseId: 'db-1',
        status: 'unhealthy',
        responseTimeMs: 5000,
        checkedAt: '2024-01-01T09:00:00.000Z',
        errorMessage: 'Connection timeout',
      },
    ];

    it('should get health checks for a database', async () => {
      mockClient.getHealthChecks.mockResolvedValue(mockHealthChecks);

      const handler = toolHandlers.get(toolName)!;
      const result = await handler({ databaseId: 'db-1' });

      expect(mockClient.getHealthChecks).toHaveBeenCalledWith('db-1');
      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveLength(2);
      expect(response[0].status).toBe('healthy');
      expect(response[1].status).toBe('unhealthy');
      expect(response[1].errorMessage).toBe('Connection timeout');
    });

    it('should respect limit parameter', async () => {
      const manyChecks: HealthCheck[] = Array.from({ length: 20 }, (_, i) => ({
        id: `hc-${i}`,
        databaseId: 'db-1',
        status: 'healthy' as const,
        responseTimeMs: 10 + i,
        checkedAt: `2024-01-01T${String(10 + i).padStart(2, '0')}:00:00.000Z`,
      }));
      mockClient.getHealthChecks.mockResolvedValue(manyChecks);

      const handler = toolHandlers.get(toolName)!;
      const result = await handler({ databaseId: 'db-1', limit: 5 });

      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveLength(5);
    });

    it('should use default limit of 10', async () => {
      const manyChecks: HealthCheck[] = Array.from({ length: 20 }, (_, i) => ({
        id: `hc-${i}`,
        databaseId: 'db-1',
        status: 'healthy' as const,
        responseTimeMs: 10 + i,
        checkedAt: `2024-01-01T${String(10 + i).padStart(2, '0')}:00:00.000Z`,
      }));
      mockClient.getHealthChecks.mockResolvedValue(manyChecks);

      const handler = toolHandlers.get(toolName)!;
      const result = await handler({ databaseId: 'db-1' });

      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveLength(10);
    });

    it('should return empty array when no health checks', async () => {
      mockClient.getHealthChecks.mockResolvedValue([]);

      const handler = toolHandlers.get(toolName)!;
      const result = await handler({ databaseId: 'db-1' });

      const response = JSON.parse(result.content[0].text);
      expect(response).toEqual([]);
    });

    it('should handle not found error', async () => {
      mockClient.getHealthChecks.mockRejectedValue(new Error('Database not found'));

      const handler = toolHandlers.get(toolName)!;
      const result = await handler({ databaseId: 'non-existent' });

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Database not found');
    });

    it('should handle API error', async () => {
      mockClient.getHealthChecks.mockRejectedValue(new Error('API error'));

      const handler = toolHandlers.get(toolName)!;
      const result = await handler({ databaseId: 'db-1' });

      expect(result.isError).toBe(true);
    });
  });

  describe('databasus_get_latest_health', () => {
    const toolName = 'databasus_get_latest_health';
    const mockHealthCheck: HealthCheck = {
      id: 'hc-latest',
      databaseId: 'db-1',
      status: 'healthy',
      responseTimeMs: 12,
      checkedAt: '2024-01-01T10:00:00.000Z',
    };

    it('should get latest health check for a database', async () => {
      mockClient.getLatestHealthCheck.mockResolvedValue(mockHealthCheck);

      const handler = toolHandlers.get(toolName)!;
      const result = await handler({ databaseId: 'db-1' });

      expect(mockClient.getLatestHealthCheck).toHaveBeenCalledWith('db-1');
      const response = JSON.parse(result.content[0].text);
      expect(response.id).toBe('hc-latest');
      expect(response.status).toBe('healthy');
      expect(response.responseTimeMs).toBe(12);
    });

    it('should handle unhealthy status', async () => {
      const unhealthyCheck: HealthCheck = {
        ...mockHealthCheck,
        status: 'unhealthy',
        errorMessage: 'Connection refused',
      };
      mockClient.getLatestHealthCheck.mockResolvedValue(unhealthyCheck);

      const handler = toolHandlers.get(toolName)!;
      const result = await handler({ databaseId: 'db-1' });

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('unhealthy');
      expect(response.errorMessage).toBe('Connection refused');
    });

    it('should handle unknown status', async () => {
      const unknownCheck: HealthCheck = {
        ...mockHealthCheck,
        status: 'unknown',
      };
      mockClient.getLatestHealthCheck.mockResolvedValue(unknownCheck);

      const handler = toolHandlers.get(toolName)!;
      const result = await handler({ databaseId: 'db-1' });

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('unknown');
    });

    it('should handle not found error', async () => {
      mockClient.getLatestHealthCheck.mockRejectedValue(new Error('No health check found'));

      const handler = toolHandlers.get(toolName)!;
      const result = await handler({ databaseId: 'db-1' });

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('No health check found');
    });

    it('should handle no health check case', async () => {
      mockClient.getLatestHealthCheck.mockResolvedValue(null as unknown as HealthCheck);

      const handler = toolHandlers.get(toolName)!;
      const result = await handler({ databaseId: 'db-1' });

      const response = JSON.parse(result.content[0].text);
      expect(response).toBeNull();
    });

    it('should handle non-Error thrown', async () => {
      mockClient.getLatestHealthCheck.mockRejectedValue({ message: 'Object error' });

      const handler = toolHandlers.get(toolName)!;
      const result = await handler({ databaseId: 'db-1' });

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Unknown error');
    });
  });

  describe('databasus_get_stats', () => {
    const toolName = 'databasus_get_stats';
    const mockStats: DatabaseStats = {
      totalDatabases: 10,
      healthyDatabases: 8,
      unhealthyDatabases: 2,
      totalBackups: 150,
      totalSize: 10737418240, // 10 GB
      lastBackupAt: '2024-01-01T10:00:00.000Z',
    };

    it('should get overall statistics', async () => {
      mockClient.getStats.mockResolvedValue(mockStats);

      const handler = toolHandlers.get(toolName)!;
      const result = await handler({});

      expect(mockClient.getStats).toHaveBeenCalledOnce();
      const response = JSON.parse(result.content[0].text);
      expect(response.totalDatabases).toBe(10);
      expect(response.healthyDatabases).toBe(8);
      expect(response.unhealthyDatabases).toBe(2);
      expect(response.totalBackups).toBe(150);
      expect(response.totalSize).toBe(10737418240);
      expect(response.lastBackupAt).toBe('2024-01-01T10:00:00.000Z');
    });

    it('should handle stats with no backups', async () => {
      const emptyStats: DatabaseStats = {
        totalDatabases: 0,
        healthyDatabases: 0,
        unhealthyDatabases: 0,
        totalBackups: 0,
        totalSize: 0,
        lastBackupAt: undefined,
      };
      mockClient.getStats.mockResolvedValue(emptyStats);

      const handler = toolHandlers.get(toolName)!;
      const result = await handler({});

      const response = JSON.parse(result.content[0].text);
      expect(response.totalDatabases).toBe(0);
      expect(response.totalBackups).toBe(0);
      expect(response.lastBackupAt).toBeUndefined();
    });

    it('should handle empty system', async () => {
      mockClient.getStats.mockResolvedValue({
        totalDatabases: 0,
        healthyDatabases: 0,
        unhealthyDatabases: 0,
        totalBackups: 0,
        totalSize: 0,
      });

      const handler = toolHandlers.get(toolName)!;
      const result = await handler({});

      const response = JSON.parse(result.content[0].text);
      expect(response.totalDatabases).toBe(0);
      expect(response.healthyDatabases).toBe(0);
    });

    it('should handle API error', async () => {
      mockClient.getStats.mockRejectedValue(new Error('Failed to fetch stats'));

      const handler = toolHandlers.get(toolName)!;
      const result = await handler({});

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Failed to fetch stats');
    });

    it('should handle authentication error', async () => {
      mockClient.getStats.mockRejectedValue(new Error('Unauthorized'));

      const handler = toolHandlers.get(toolName)!;
      const result = await handler({});

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Unauthorized');
    });

    it('should handle network error', async () => {
      mockClient.getStats.mockRejectedValue(new Error('Network error'));

      const handler = toolHandlers.get(toolName)!;
      const result = await handler({});

      expect(result.isError).toBe(true);
    });

    it('should handle non-Error thrown', async () => {
      mockClient.getStats.mockRejectedValue('String error');

      const handler = toolHandlers.get(toolName)!;
      const result = await handler({});

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Unknown error');
    });
  });

  describe('Tool Registration', () => {
    it('should register all 5 workspace tools', () => {
      expect(mockServer.tool).toHaveBeenCalledTimes(5);
      
      const registeredNames = (mockServer.tool as Mock).mock.calls.map(call => call[0]);
      expect(registeredNames).toContain('databasus_list_workspaces');
      expect(registeredNames).toContain('databasus_get_workspace');
      expect(registeredNames).toContain('databasus_get_health_checks');
      expect(registeredNames).toContain('databasus_get_latest_health');
      expect(registeredNames).toContain('databasus_get_stats');
    });

    it('should have correct descriptions for all tools', () => {
      const calls = (mockServer.tool as Mock).mock.calls;
      
      calls.forEach(call => {
        const description = call[1];
        expect(typeof description).toBe('string');
        expect(description.length).toBeGreaterThan(0);
      });
    });
  });
});
