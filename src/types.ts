// Configuration
export interface DatabasusConfig {
  baseUrl: string;
  apiKey?: string;
  bearerToken?: string;
}

// Database types
export type DatabaseType = 'postgres' | 'mysql' | 'mariadb' | 'mongodb';

export type ScheduleType = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'cron';

export type BackupStatus = 'pending' | 'running' | 'completed' | 'failed';

export type HealthStatus = 'healthy' | 'unhealthy' | 'unknown';

// Database entity
export interface Database {
  id: string;
  name: string;
  type: DatabaseType;
  host: string;
  port: number;
  databaseName: string;
  username: string;
  sslMode: string;
  scheduleType: ScheduleType;
  scheduleValue: string;
  retentionDays: number;
  enabled: boolean;
  storageId: string;
  notifierIds: string[];
  healthCheckEnabled: boolean;
  healthCheckIntervalMinutes: number;
  lastBackupAt?: string;
  lastBackupStatus?: BackupStatus;
  nextBackupAt?: string;
  healthStatus?: HealthStatus;
  createdAt: string;
  updatedAt: string;
}

// Backup entity
export interface Backup {
  id: string;
  databaseId: string;
  status: BackupStatus;
  size: number;
  duration: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
  storagePath: string;
  encrypted: boolean;
  compressed: boolean;
}

// Storage types and entity
export type StorageType = 'local' | 's3' | 'google_drive' | 'dropbox' | 'sftp' | 'ftp' | 'rclone' | 'azure_blob' | 'gcs';

export interface Storage {
  id: string;
  name: string;
  type: StorageType;
  enabled: boolean;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Notifier types and entity
export type NotifierType = 'email' | 'slack' | 'discord' | 'telegram' | 'webhook';

export interface Notifier {
  id: string;
  name: string;
  type: NotifierType;
  enabled: boolean;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Workspace entity
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  databaseCount: number;
  createdAt: string;
  updatedAt: string;
}

// Health check
export interface HealthCheck {
  id: string;
  databaseId: string;
  status: HealthStatus;
  responseTimeMs: number;
  checkedAt: string;
  errorMessage?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Create/Update DTOs
export interface CreateDatabaseDto {
  name: string;
  type: DatabaseType;
  host: string;
  port: number;
  databaseName: string;
  username: string;
  password: string;
  sslMode?: string;
  scheduleType: ScheduleType;
  scheduleValue: string;
  retentionDays?: number;
  storageId: string;
  notifierIds?: string[];
  healthCheckEnabled?: boolean;
  healthCheckIntervalMinutes?: number;
}

export interface UpdateDatabaseDto {
  name?: string;
  host?: string;
  port?: number;
  databaseName?: string;
  username?: string;
  password?: string;
  sslMode?: string;
  scheduleType?: ScheduleType;
  scheduleValue?: string;
  retentionDays?: number;
  enabled?: boolean;
  storageId?: string;
  notifierIds?: string[];
  healthCheckEnabled?: boolean;
  healthCheckIntervalMinutes?: number;
}

export interface CreateStorageDto {
  name: string;
  type: StorageType;
  config: Record<string, unknown>;
}

export interface UpdateStorageDto {
  name?: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
}

export interface CreateNotifierDto {
  name: string;
  type: NotifierType;
  config: Record<string, unknown>;
}

export interface UpdateNotifierDto {
  name?: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
}

// Statistics
export interface DatabaseStats {
  totalDatabases: number;
  healthyDatabases: number;
  unhealthyDatabases: number;
  totalBackups: number;
  totalSize: number;
  lastBackupAt?: string;
}
