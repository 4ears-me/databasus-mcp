# Databasus MCP

An MCP (Model Context Protocol) server for controlling Databasus database backup instances. This allows AI assistants like Claude to manage your database backups through natural language.

## Features

- **Database Management**: List, create, update, and delete database backup configurations
- **Backup Operations**: List backups, trigger manual backups, download and delete backups
- **Storage Management**: Configure and test backup storage destinations (S3, Google Drive, FTP, etc.)
- **Notifier Management**: Set up notifications via Slack, Discord, Telegram, Email, webhooks
- **Health Monitoring**: Check database health status and history
- **Workspace Management**: View workspaces for team-based access control

## Installation

### Prerequisites

- Node.js 18 or higher
- A running Databasus instance
- API key or bearer token from your Databasus instance

### Install via npm

```bash
npm install -g @4ears-me/databasus-mcp
```

### Run directly with npx

```bash
npx @4ears-me/databasus-mcp
```

## Configuration

Set the following environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASUS_URL` | Yes | Base URL of your Databasus instance (e.g., `https://backup.example.com`) |
| `DATABASUS_API_KEY` | No* | API key for authentication |
| `DATABASUS_BEARER_TOKEN` | No* | Bearer token for authentication |

*Either `DATABASUS_API_KEY` or `DATABASUS_BEARER_TOKEN` is required for authenticated endpoints.

## Usage with Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "databasus": {
      "command": "npx",
      "args": ["@4ears-me/databasus-mcp"],
      "env": {
        "DATABASUS_URL": "https://your-databasus-instance.com",
        "DATABASUS_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Available Tools

### Database Tools
- `databasus_list_databases` - List all configured databases
- `databasus_get_database` - Get details of a specific database
- `databasus_create_database` - Create a new database backup configuration
- `databasus_update_database` - Update an existing database configuration
- `databasus_delete_database` - Delete a database configuration
- `databasus_trigger_backup` - Manually trigger a backup
- `databasus_toggle_database` - Enable or disable a database

### Backup Tools
- `databasus_list_backups` - List all backups (optionally filtered by database)
- `databasus_get_backup` - Get details of a specific backup
- `databasus_download_backup` - Get download information for a backup
- `databasus_delete_backup` - Delete a backup
- `databasus_get_backup_stats` - Get backup statistics

### Storage Tools
- `databasus_list_storages` - List all storage destinations
- `databasus_get_storage` - Get details of a specific storage
- `databasus_create_storage` - Create a new storage destination
- `databasus_update_storage` - Update an existing storage
- `databasus_delete_storage` - Delete a storage destination
- `databasus_test_storage` - Test storage connection

### Notifier Tools
- `databasus_list_notifiers` - List all notifiers
- `databasus_get_notifier` - Get details of a specific notifier
- `databasus_create_notifier` - Create a new notifier
- `databasus_update_notifier` - Update an existing notifier
- `databasus_delete_notifier` - Delete a notifier
- `databasus_test_notifier` - Test notifier by sending a test notification

### Workspace & Health Tools
- `databasus_list_workspaces` - List all workspaces
- `databasus_get_workspace` - Get details of a specific workspace
- `databasus_get_health_checks` - Get health check history for a database
- `databasus_get_latest_health` - Get latest health status for a database
- `databasus_get_stats` - Get overall statistics

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev

# Run the built server
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## About Databasus

[Databasus](https://databasus.com) is an open-source, self-hosted database backup tool supporting PostgreSQL, MySQL, MariaDB, and MongoDB. It features:
- Scheduled backups with flexible timing
- Multiple storage destinations (S3, Google Drive, FTP, etc.)
- Notifications via Slack, Discord, Telegram, Email
- AES-256-GCM encryption
- Team access management
- Health monitoring

## License

MIT
