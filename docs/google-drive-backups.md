# Google Drive Backups

This project includes a backup worker that:

- reads backup settings from the admin panel
- creates a full PostgreSQL SQL dump with `pg_dump`
- uploads the timestamped SQL file to a connected personal Google Drive account

## Admin Settings

Open `/admin-dashboard/settings` and configure:

- backup enabled or disabled
- backup interval in minutes
- optional Google Drive folder URL
- Google OAuth client ID
- Google OAuth client secret
- connect your personal Google Drive account through the admin UI

The worker will create or reuse a folder named `event-management-backups`.

## Google OAuth Setup

Create OAuth credentials in Google Cloud and add this redirect URI:

```text
https://your-domain.com/api/admin/backup-drive/callback
```

Then save the client ID and client secret in the Backup section and click `Connect Google Drive`.
The admin page shows the exact redirect URI to register. The connect flow also preserves the browser's current origin so it can work correctly behind proxies even when the app server itself runs on localhost internally.

## Scheduler Command

Run this command on the production server every 5 minutes:

```bash
npm run backup:worker
```

The worker checks the saved interval and only creates a backup when it is due.

## Requirements

- `DATABASE_URL` must be available to the worker
- `pg_dump` must be installed and available in `PATH`
- if `pg_dump` is not in `PATH`, set `PG_DUMP_PATH`
- the connected Google account must have access to the selected Drive folder

## Backup Contents

The worker creates a plain SQL backup using `pg_dump` with:

- schema
- tables
- sequences
- functions
- triggers
- data
- database creation statements

The generated file is named like:

```text
event-management-backup-2026-03-26_14-30-00.sql
```

## Restore Example

```bash
psql -d postgres -f event-management-backup-2026-03-26_14-30-00.sql
```
