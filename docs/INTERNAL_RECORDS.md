# Respondo Internal Records (Sisäinen arkisto)

This is a **private Respondo/Movexa operational document archive**, distinct from each customer's Respondo dashboard and from the chatbot's knowledge base. It is not a customer-facing product feature.

## Location and initial authorization

- Location: the owner's **Visitors** page (`/traffic.html`) has a private archive card, which opens `/arkisto`.
- The existing session cookie is required on every request.
- The **only** permitted account is the **active** Respondo user whose database email matches `OWNER_EMAIL`, falling back to `SUPPORT_EMAIL`. The account is verified against the database on every request, not by a self-editable profile or URL parameter. If neither variable is configured, access fails closed.
- Other customers, employees, support agents, and administrators do **not** have access even if they know or guess the URL. There is no invitation or permission-sharing endpoint.
- The user must be logged in through their existing Respondo owner account. The full session validation (including server-checked session version) is reused.

## Data model and isolation

The application creates the `respondo_internal` PostgreSQL schema during startup, under the existing runtime schema advisory lock. Its tables are `vault_documents`, `vault_versions`, and `vault_audit`.

The schema has no public API exposure. `PUBLIC`, `anon`, `authenticated`, and `service_role` are explicitly denied access; all three tables have RLS enabled with no Data API policies. Only the trusted backend database connection accesses these tables and verifies the owner on each request. The existing application rejects cross-site authenticated mutations. All reads, uploads, downloads and restores are server-controlled.

Documents belong to the internal corporate archive, not to customer tenants. The customer-company register shows only non-secret business account metadata (company, website, contact email, plan and status); passwords, payment tokens and API keys are never returned. Files in the archive are never included in chatbot responses or website knowledge imports.

## Storage and recovery

- Current implementation stores file bytes in PostgreSQL `BYTEA` within private `vault_versions` records. It does **not** create public file URLs or rely on ephemeral Railway disk.
- Maximum **5 MiB per file** and **250 MiB total version history** across this archive. Larger file storage should use a separate private object-storage service and malware scanning before the limits are raised.
- Extensions: `.pdf`, `.txt`, `.csv`, `.png`, `.jpg`, `.jpeg`, `.docx`, `.xlsx`, `.pptx`, `.odt`, `.ods`. Files are always downloaded as attachments (`application/octet-stream`, `nosniff`, `no-store`) and are never executed or shown inline.
- Notes have immutable versions; replacing a file creates a new immutable version with a SHA-256 hash. The app uses optimistic concurrency checks to avoid silently overwriting a newer version.
- Deletion is a recoverable soft delete (trash); only admins and the owner can restore.
- Audit records include views, downloads, changes, restores and deletions.
- The archive is part of the PostgreSQL database: verify that **database backup and restore testing** cover `respondo_internal` tables and BYTEA data. Do not assume a backup is complete merely because a workflow exists.
- Historical versions and audit records count towards database storage and require a retention policy before large-scale use.

## Operating the archive

1. Log in with the configured owner account, open the **Visitors** page, then choose **Internal records** (or open `/arkisto` directly).
2. Create a document with title, folder, description, and body; or upload a supported file.
3. All records are accessible exclusively through the owner account, regardless of their additional confidentiality label.
4. Use **Activity log** to review document events and **Trash** to restore accidentally removed items.

## Not yet included

- This is an owner-only records archive, **not** a certified DMS. It does not currently include malware scanning, mandatory MFA, electronic signatures, automatic document ingestion, storage outside PostgreSQL, legal holds, or a verified retention schedule.
- Existing contracts, invoices, and private customer files are **not automatically copied in**. They must be imported intentionally and reviewed to avoid duplicate records or unauthorized exposure.
- Do not upload passwords, private API tokens, or secret keys as ordinary documents. Continue to manage secrets with the existing credential store.
