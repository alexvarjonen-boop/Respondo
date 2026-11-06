# Respondo AI – Microsoft Outlook / Microsoft 365 OAuth (production)

This is **one Respondo-owned app registration for all customers**. Every customer authorizes their own Microsoft identity and mailbox. Do not register separate Microsoft apps for each Respondo tenant. Never reuse ChatGPT's Microsoft connector credentials.

## Required one-time Microsoft Entra registration

1. Sign in as an authorized app-registration administrator at https://entra.microsoft.com.
2. **App registrations → New registration**; name **Respondo AI**.
3. **Supported account types:** **Accounts in any organizational directory and personal Microsoft accounts** (`AzureADandPersonalMicrosoftAccount`). This includes Microsoft 365 work/school identities and consumer Outlook.com/Hotmail identities.
4. **Authentication → Add a platform → Web**. Register **both exact redirect URIs**:
   - `https://respondoai.fi/api/app/native/mail/outlook/callback`
   - `https://www.respondoai.fi/api/app/native/mail/outlook/callback`
   Both matter because Respondo accepts both hostnames and its session cookies are host-only. The backend selects only an allowlisted current hostname; other Host values cannot influence OAuth callbacks.
5. **API permissions → Microsoft Graph → Delegated permissions:** `User.Read`, `Mail.Read`, `Mail.Send`. The OAuth flow requests `offline_access` for a refresh token. Do **not** grant application-level mailbox access: Respondo uses delegated access to the signed-in user.
6. **Certificates & secrets:** create a web client secret. Treat its **Value** as sensitive. Do not paste it in GitHub issues, code, support chats or documentation.
7. In the **production** Railway service set:
   - `MICROSOFT_CLIENT_ID` = the Application (client) ID.
   - `MICROSOFT_CLIENT_SECRET` = the credential **Value**, not its Secret ID.
   Both variables are server-side; never expose them in the browser.
8. Redeploy and verify `GET /api/app/native/mail/status` from an authenticated subscribed owner session reports `oauthAvailable.outlook: true`. This only means configuration is present, **not** that consent or email sync has succeeded.
9. Test `Yhdistä Outlook` on **both apex and www domain**. The browser must open Microsoft, then return to `/app?section=integrations&provider=outlook&native_mail=connected`; check the saved mailbox and manually sync one email. Perform separate delegated tests for a Microsoft 365 organizational account and a personal Outlook.com account. Never send an email without explicit owner approval.

## Authorization and limits

- Some corporate Entra tenants require tenant administrator consent, may block unverified publisher apps, or disallow external apps entirely. Show the `admin_approval_required` feedback when Microsoft indicates this requirement. Registration alone cannot override those policies.
- Before external rollout, configure verified publisher details if eligible, keep the app's credentials rotated, review privacy and data-retention policies, and confirm the login consent screen reflects the actual delegated permissions.
- `respondo_native_mail_credentials` stores one encrypted Outlook authorization per Respondo tenant; OAuth state contains the tenant and signed-in owner identity. The application credentials never identify or authorize a customer's mailbox on their own.
- Microsoft Graph mail operations remain subject to Microsoft service availability and any mailbox restrictions.
- Do not claim a connection is live until it is actually authorized, saved, and tested.

Official references: https://learn.microsoft.com/en-us/graph/auth-register-app-v2 and https://learn.microsoft.com/en-us/graph/permissions-reference
