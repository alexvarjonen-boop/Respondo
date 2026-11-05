# Respondo AI — production integration activation checklist

Reviewed: 2026-11-05. This checklist distinguishes **implementation**, **provider application setup**, **customer authorization**, **verification**, and **actual production use**. These are separate conditions.

## Current audited configuration (variable names only; never publish values)

Railway production application had names for:
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: **configured in deployment**, but this does **not** verify an authorized Gmail, Google Drive or Google Calendar workspace.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`: **configured in deployment**, but this does **not** verify any individual merchant Stripe Connect account or charge capability.

Railway production application **did not** contain:
- `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` — Outlook and SharePoint OAuth cannot start.
- `META_APP_SECRET`, `META_VERIFY_TOKEN` — WhatsApp, Instagram and Facebook Messenger webhook verification/delivery unavailable.
- `ZENDESK_OAUTH_CLIENT_ID`, `ZENDESK_OAUTH_CLIENT_SECRET` — Zendesk OAuth cannot start.

This is a snapshot of Respondo's central configuration, **not** an audit of individual customers' connected accounts. No credentials are recorded in this document.

## One-time setup for the Respondo operator

### Microsoft 365 / Outlook and SharePoint
1. Register a **Respondo-owned** Microsoft Entra application with the correct supported account types for customers (organization accounts, and personal Microsoft accounts if intended).
2. Add **Web** redirect URIs, on the same canonical `BASE_URL` origin used by the running service:
   - `/api/app/native/mail/outlook/callback`
   - `/api/app/native/cloud/sharepoint/callback`
3. Configure delegated permissions consistent with the code: `offline_access`, `User.Read`, `Mail.Read`, `Mail.Send`, `Files.Read.All`, `Sites.Read.All`. Some permissions and tenant policies may require administrator consent. Do not grant more than needed.
4. Add the obtained application (client) ID and new client secret to the **Railway production service environment**, under `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET`. Keep secrets off GitHub, screenshots and chat.
5. Redeploy and inspect `/app?section=integrations`. A customer must still log into Microsoft and consent; SharePoint additionally requires a valid site ID.
6. Verify with a real authorized test mailbox (read only; drafts/sending require explicit approval), and a test SharePoint site.

### Meta: WhatsApp, Instagram Business, Facebook Messenger
1. Create a Respondo-owned Meta Developer app, configure the applicable products, Business account and access permissions, and complete provider review where required.
2. Configure callback URL `https://respondoai.fi/api/webhooks/respondo-meta` (use the exact canonical production host); GET performs verification, POST verifies a signed webhook payload.
3. Set `META_APP_SECRET` and a **new random, unpredictable** `META_VERIFY_TOKEN` of **at least 16 characters** on Railway. Treat both as secrets.
4. Set the exact same verify token in the Meta app. Verify webhook subscription and relevant resource/page IDs before customer testing.
5. Connect one test business account, receive a real inbound event, check tenant-scoped mapping and message visibility. Do not enable unattended outbound messages without authorized consent and policy review.

### Zendesk
1. Register an OAuth client in Zendesk with the Respondo callback `https://respondoai.fi/api/app/helpdesk/zendesk/callback` (or the `SEO_CANONICAL_ORIGIN` actually configured).
2. Store the client ID and secret in Railway as `ZENDESK_OAUTH_CLIENT_ID` and `ZENDESK_OAUTH_CLIENT_SECRET`.
3. Complete OAuth through an authorized Zendesk test workspace, verify ticket read access, then approve and export a test ticket. A saved credential alone is not a successful export.

### Google
1. Verify that the registered OAuth client includes the **actual** redirect origins/URIs used by each workflow; unlike cloud and mailbox callbacks, the **Calendar** auth callback is configured in code as `https://www.respondoai.fi/api/auth/oauth/google/callback` in production.
2. Mail callback: canonical `BASE_URL` + `/api/app/native/mail/gmail/callback`.
3. Drive callback: canonical `BASE_URL` + `/api/app/native/cloud/google_drive/callback`.
4. Ensure required OAuth consent screen, requested scopes, verified/authorized users and provider approval where applicable. `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` being set does not prove any of those steps.
5. Validate a real mailbox, Drive document listing and calendar availability check separately; no customer's data should be imported or published without their approval.

### Customer-specific credentials (never global)
- **HubSpot / Pipedrive:** customer creates and authorizes their own CRM access. Save per-tenant; validate by an authenticated read and a test lead **only with explicit approval**.
- **Shopify / WooCommerce:** customer supplies store-specific token or REST API credentials. Verify scopes and read-only order lookup on a permitted test order.
- **Freshdesk:** customer supplies Freshdesk domain and API key; verify tenant connection and authorize a test export separately.
- **Stripe Connect:** customer completes Stripe-hosted onboarding and verification; verify the connected account's actual charge and payout readiness before advertising payments.
- **Google Calendar:** customers authorize their calendar even when the global Google OAuth application is configured. Bookings must still fit the actual verified duration and available slot.
- **Respondo native calendar, tasks, inbox, knowledge base:** do not require third-party application registration. They still require normal tenant-level configuration and functional testing.
- **Webhooks / API:** only configure when the customer provides a secure HTTPS receiver and authorizes the destination. Test delivery and retries.

## Required release acceptance criteria

An integration may show a green “Connected / Active” only when:
1. The provider-level prerequisites are configured and an authenticated tenant-scoped authorization exists.
2. Its token/scopes/permissions are checked by a **real** provider request or equivalent verified provider response.
3. Its intended operation (mail sync, slot check, lead sync, authorized ticket export, etc.) has passed a safe, non-destructive live test.
4. Required provider/owner approvals and any provider-side review or tenant admin consent have been completed.

Otherwise show **Requires setup**, **Needs authorization**, **Saved — not verified**, or **Status unavailable**. UI availability or passing unit tests alone is not proof that an integration works.

**Cost safety:** Do not automatically subscribe to services, activate paid add-ons, or consume unapproved credits. A provider's independent charges or plan restrictions must be checked before enrollment.

**Security:** Keep secrets only in server-side encrypted storage/secret management; use tenant-level ownership checks and scoped tokens. No automatic outgoing emails, messages, purchases, or paid actions without explicit approval.
