import type {
  DatabasusConfig,
  Database,
  CreateDatabaseDto,
  UpdateDatabaseDto,
  Backup,
  Storage,
  CreateStorageDto,
  UpdateStorageDto,
  Notifier,
  CreateNotifierDto,
  UpdateNotifierDto,
  Workspace,
  HealthCheck,
  DatabaseStats,
} from './types.js';

export class DatabasusClient {
  private baseUrl: string;
  private apiKey?: string;
  private bearerToken?: string;

  constructor(config: DatabasusConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.bearerToken = config.bearerToken;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.bearerToken) {
      headers['Authorization'] = `Bearer ${this.bearerToken}`;
    } else if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    return headers;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = this.getHeaders();

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    let response: Response;
    try {
      response = await fetch(url, options);
    } catch (error) {
      throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    let data: unknown;
    const responseText = await response.text();

    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
      }
    }

    if (!response.ok) {
      const errorMessage = this.extractErrorMessage(data, response.status);
      throw new Error(errorMessage);
    }

    return data as T;
  }

  private extractErrorMessage(data: unknown, status: number): string {
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      if (typeof obj.error === 'string') return obj.error;
      if (typeof obj.message === 'string') return obj.message;
    }
    return `HTTP error ${status}`;
  }

  // Database Operations
  async getDatabases(): Promise<Database[]> {
    return this.request<Database[]>('GET', '/api/databases');
  }

  async getDatabase(id: string): Promise<Database> {
    return this.request<Database>('GET', `/api/databases/${id}`);
  }

  async createDatabase(data: CreateDatabaseDto): Promise<Database> {
    return this.request<Database>('POST', '/api/databases', data);
  }

  async updateDatabase(id: string, data: UpdateDatabaseDto): Promise<Database> {
    return this.request<Database>('PUT', `/api/databases/${id}`, data);
  }

  async deleteDatabase(id: string): Promise<void> {
    await this.request<void>('DELETE', `/api/databases/${id}`);
  }

  async triggerBackup(id: string): Promise<Backup> {
    return this.request<Backup>('POST', `/api/databases/${id}/backup`);
  }

  // Backup Operations
  async getBackups(databaseId?: string): Promise<Backup[]> {
    const path = databaseId ? `/api/backups?databaseId=${databaseId}` : '/api/backups';
    return this.request<Backup[]>('GET', path);
  }

  async getBackup(id: string): Promise<Backup> {
    return this.request<Backup>('GET', `/api/backups/${id}`);
  }

  async downloadBackup(id: string): Promise<{ url: string } | Blob> {
    return this.request<{ url: string } | Blob>('GET', `/api/backups/${id}/download`);
  }

  async deleteBackup(id: string): Promise<void> {
    await this.request<void>('DELETE', `/api/backups/${id}`);
  }

  // Storage Operations
  async getStorages(): Promise<Storage[]> {
    return this.request<Storage[]>('GET', '/api/storages');
  }

  async getStorage(id: string): Promise<Storage> {
    return this.request<Storage>('GET', `/api/storages/${id}`);
  }

  async createStorage(data: CreateStorageDto): Promise<Storage> {
    return this.request<Storage>('POST', '/api/storages', data);
  }

  async updateStorage(id: string, data: UpdateStorageDto): Promise<Storage> {
    return this.request<Storage>('PUT', `/api/storages/${id}`, data);
  }

  async deleteStorage(id: string): Promise<void> {
    await this.request<void>('DELETE', `/api/storages/${id}`);
  }

  async testStorage(id: string): Promise<{ success: boolean; message?: string }> {
    return this.request<{ success: boolean; message?: string }>('POST', `/api/storages/${id}/test`);
  }

  // Notifier Operations
  async getNotifiers(): Promise<Notifier[]> {
    return this.request<Notifier[]>('GET', '/api/notifiers');
  }

  async getNotifier(id: string): Promise<Notifier> {
    return this.request<Notifier>('GET', `/api/notifiers/${id}`);
  }

  async createNotifier(data: CreateNotifierDto): Promise<Notifier> {
    return this.request<Notifier>('POST', '/api/notifiers', data);
  }

  async updateNotifier(id: string, data: UpdateNotifierDto): Promise<Notifier> {
    return this.request<Notifier>('PUT', `/api/notifiers/${id}`, data);
  }

  async deleteNotifier(id: string): Promise<void> {
    await this.request<void>('DELETE', `/api/notifiers/${id}`);
  }

  async testNotifier(id: string): Promise<{ success: boolean; message?: string }> {
    return this.request<{ success: boolean; message?: string }>('POST', `/api/notifiers/${id}/test`);
  }

  // Workspace Operations
  async getWorkspaces(): Promise<Workspace[]> {
    return this.request<Workspace[]>('GET', '/api/workspaces');
  }

  async getWorkspace(id: string): Promise<Workspace> {
    return this.request<Workspace>('GET', `/api/workspaces/${id}`);
  }

  // Health Check Operations
  async getHealthChecks(databaseId: string): Promise<HealthCheck[]> {
    return this.request<HealthCheck[]>('GET', `/api/databases/${databaseId}/health-checks`);
  }

  async getLatestHealthCheck(databaseId: string): Promise<HealthCheck> {
    return this.request<HealthCheck>('GET', `/api/databases/${databaseId}/health-checks/latest`);
  }

  // Statistics
  async getStats(): Promise<DatabaseStats> {
    return this.request<DatabaseStats>('GET', '/api/stats');
  }
}