# Databasus MCP

## Purpose

This repository provides an MCP (Model Context Protocol) server for controlling Databasus database backup instances. It exposes all relevant Databasus behaviors for agentic control, allowing AI assistants like Claude to manage database backups through natural language.

## Workflow

All changes must be made on a branch and submitted via a pull request:

1. Create a new branch for your changes
2. Make your changes on the branch
3. Open a pull request targeting `main`
4. Wait for CI checks to pass
5. Get approval from a reviewer
6. Merge the pull request

Direct pushes to `main` are not allowed.

## Technology

- **Language**: TypeScript
- **Runtime**: Node.js 18+
- **Execution**: npx (via `npx @4ears-me/databasus-mcp`)
- **Transport**: stdio (standard input/output)
- **SDK**: @modelcontextprotocol/sdk v1.26.0

## Project Structure

```
databasus-mcp/
├── src/
│   ├── index.ts          # Main MCP server entry point
│   ├── client.ts         # Databasus REST API client
│   ├── types.ts          # TypeScript type definitions
│   └── tools/
│       ├── databases.ts  # Database management tools
│       ├── backups.ts    # Backup operations tools
│       ├── storages.ts   # Storage management tools
│       ├── notifiers.ts  # Notifier management tools
│       └── workspaces.ts # Workspace & health check tools
├── dist/                 # Compiled JavaScript output
├── package.json          # npm configuration
├── tsconfig.json         # TypeScript configuration
└── README.md             # User documentation
```

## Configuration

The server requires these environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASUS_URL` | Yes | Base URL of the Databasus instance |
| `DATABASUS_API_KEY` | No* | API key for authentication |
| `DATABASUS_BEARER_TOKEN` | No* | Bearer token for authentication |

*At least one authentication method should be provided.

## Available MCP Tools

### Database Management (7 tools)
- `databasus_list_databases` - List all configured databases
- `databasus_get_database` - Get details of a specific database by ID
- `databasus_create_database` - Create a new database backup configuration
- `databasus_update_database` - Update an existing database configuration
- `databasus_delete_database` - Delete a database configuration
- `databasus_trigger_backup` - Manually trigger a backup for a database
- `databasus_toggle_database` - Enable or disable a database

### Backup Operations (5 tools)
- `databasus_list_backups` - List all backups (optionally filtered by database)
- `databasus_get_backup` - Get details of a specific backup
- `databasus_download_backup` - Get download information for a backup
- `databasus_delete_backup` - Delete a backup
- `databasus_get_backup_stats` - Get backup statistics

### Storage Management (6 tools)
- `databasus_list_storages` - List all storage destinations
- `databasus_get_storage` - Get details of a specific storage
- `databasus_create_storage` - Create a new storage destination
- `databasus_update_storage` - Update an existing storage
- `databasus_delete_storage` - Delete a storage destination
- `databasus_test_storage` - Test storage connection

### Notifier Management (6 tools)
- `databasus_list_notifiers` - List all notifiers
- `databasus_get_notifier` - Get details of a specific notifier
- `databasus_create_notifier` - Create a new notifier
- `databasus_update_notifier` - Update an existing notifier
- `databasus_delete_notifier` - Delete a notifier
- `databasus_test_notifier` - Test notifier by sending a test notification

### Workspace & Health (5 tools)
- `databasus_list_workspaces` - List all workspaces
- `databasus_get_workspace` - Get details of a specific workspace
- `databasus_get_health_checks` - Get health check history for a database
- `databasus_get_latest_health` - Get latest health status for a database
- `databasus_get_stats` - Get overall statistics

## Databasus API

The DatabasusClient class in `src/client.ts` communicates with the Databasus REST API:

**Base Endpoints:**
- `GET /api/databases` - List databases
- `POST /api/databases` - Create database
- `GET /api/databases/:id` - Get database
- `PUT /api/databases/:id` - Update database
- `DELETE /api/databases/:id` - Delete database
- `POST /api/databases/:id/backup` - Trigger backup
- `GET /api/databases/:id/health-checks` - Get health checks
- `GET /api/backups` - List backups
- `GET /api/backups/:id` - Get backup
- `GET /api/backups/:id/download` - Download backup
- `DELETE /api/backups/:id` - Delete backup
- `GET /api/storages` - List storages
- `POST /api/storages` - Create storage
- `GET /api/storages/:id` - Get storage
- `PUT /api/storages/:id` - Update storage
- `DELETE /api/storages/:id` - Delete storage
- `POST /api/storages/:id/test` - Test storage
- `GET /api/notifiers` - List notifiers
- `POST /api/notifiers` - Create notifier
- `GET /api/notifiers/:id` - Get notifier
- `PUT /api/notifiers/:id` - Update notifier
- `DELETE /api/notifiers/:id` - Delete notifier
- `POST /api/notifiers/:id/test` - Test notifier
- `GET /api/workspaces` - List workspaces
- `GET /api/workspaces/:id` - Get workspace
- `GET /api/stats` - Get statistics

## Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode (with tsx)
npm run dev

# Run compiled server
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Security Notes

- Sensitive configuration values (passwords, API keys, tokens) are masked in tool outputs
- The client supports both API key (`X-API-Key` header) and Bearer token authentication
- All communication with Databasus uses HTTPS in production

## About Databasus

[Databasus](https://databasus.com) is an open-source, self-hosted database backup tool supporting:
- PostgreSQL, MySQL, MariaDB, MongoDB
- Scheduled backups (hourly, daily, weekly, monthly, cron)
- Multiple storage destinations (S3, Google Drive, FTP, SFTP, etc.)
- Notifications (Slack, Discord, Telegram, Email, Webhooks)
- AES-256-GCM encryption
- Team access management with workspaces
- Database health monitoring
