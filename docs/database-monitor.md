# Database Monitor

The Database Monitor page includes the database configured by `DATABASE_URL` and any additional PostgreSQL URLs registered in the page. It checks connectivity, response time, PostgreSQL version, connection count, and database size when the page loads or is refreshed.

Set `DATABASE_MONITOR_ENCRYPTION_KEY` in each application environment before using the page. Use a long random secret and keep it in the deployment secret manager, for example generate one with `openssl rand -base64 32`. The application encrypts registered connection URLs with AES-256-GCM before storing them in `CORE_DatabaseServer`. Losing this key makes saved URLs unreadable.

Apply the migration with `pnpm db:migrate` after setting `DATABASE_URL`. Database connections are initiated by the application server, so a local PostgreSQL instance can only be monitored when the running app server can reach it over the network. A Vercel deployment cannot connect to `localhost` on a developer's computer. Prefer dedicated read-only database credentials when the provider supports them.
