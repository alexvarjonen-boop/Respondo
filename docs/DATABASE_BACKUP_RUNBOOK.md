# Respondo AI — database backup and recovery

Production database: Supabase `respondo` (PostgreSQL 17).
Hosting: Railway (`respondo-web-hotfix`).
This project currently uses Supabase **Free**, which does not include a
customer-accessible automated backup/restore service.

## Activate no-plaintext scheduled backups

The workflow `.github/workflows/encrypted-database-backup.yml` runs daily
at 02:27 UTC and keeps **encrypted** backup artifacts for 7 days.

Before enabling it:

1. Generate a unique passphrase (at least 24 random characters). Store it
   *outside GitHub*, preferably in an offline password manager or encrypted vault.
   Losing it means the backup cannot be decrypted.
2. In GitHub repository Settings > Secrets and variables > Actions > Secrets,
   add `BACKUP_ENCRYPTION_PASSPHRASE` with that value.
3. Add `SUPABASE_BACKUP_DB_URL` with the Supabase PostgreSQL **session pooler**
   connection URI (Supabase dashboard > Connect > Session pooler, port 5432).
   The URI must include the password; use a dedicated least-privileged
   backup role if available. Never put the URI in a repository file.
   A direct IPv6-only connection may not work from GitHub-hosted runners.
4. In the repository Actions **Variables**, set `RESPONDO_BACKUPS_ENABLED`
   to `true`. Before doing that, the workflow intentionally does nothing.
5. Open Actions > Encrypted Supabase database backup > Run workflow.
   Confirm a successful run and a downloadable encrypted artifact. Verify
   the restore workflow against an isolated database before relying on backups.

The workflow exports only the `public` schema (app tables and data).
It does not capture Supabase Auth/Storage schemas, external uploaded objects,
platform configuration, environment secrets, third-party Stripe data, or
other providers' data. Review the scope as the product expands.

## Restore test (never on production first)

1. Download an `respondo-db-encrypted-*` artifact from GitHub Actions.
2. Decrypt locally using the passphrase retained outside GitHub:

   `openssl enc -d -aes-256-cbc -pbkdf2 -iter 250000 -in respondo-public.dump.enc -out respondo-public.dump -pass stdin`

   Enter the passphrase when prompted. Avoid storing it in shell history.
3. Restore to an **empty isolated Postgres 17 test database** with
   `pg_restore --no-owner --no-acl --dbname "$RESTORE_TEST_DATABASE_URL" respondo-public.dump`.
   Restoring to an existing schema can cause conflicts. Never point this
   command at production without a separately reviewed recovery plan.
4. Check user/tenant/knowledge row counts, foreign keys, and relevant login
   and bot QA behavior in that isolated environment.
5. Securely delete decrypted temporary data when the test finishes.

## Operational review

- Alert if there is no successful backup in the last 24–36 hours.
- Keep the encryption passphrase and recovery instructions with another
  trusted operator.
- Backups and restores must be tested regularly; an uploaded artifact by
  itself is not proof of recoverability.
- For managed automated backups and a restore dashboard, Supabase Pro
  adds a paid option; upgrading requires separate billing approval.
