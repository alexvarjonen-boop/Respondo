# Respondo — first-party free webhook integration

This endpoint is **not** a paid integration service. It runs on Respondo's existing backend and uses only Node's standard crypto module and PostgreSQL. Existing hosting and provider plan fees are not covered by this claim.

## Set up

1. In the authenticated Respondo workspace, open **Actions → Own API / webhook**.
2. Generate a new signing key. Save the secret in the sending application's secure environment. It is only shown once; rotating it invalidates the old key immediately.
3. Use the displayed company-scoped endpoint, for example `https://respondoai.fi/api/webhooks/respondo-native/WORKSPACE_UUID`.
4. Implement the exact signing contract below. This is a **Respondo-specific** format, not Shopify or WooCommerce's standard webhook signature; using those vendors' built-in webhooks directly requires separate signature adapters.
5. Choose event `kind: "lead_captured"` or `kind: "order_status"`. Each event must have a stable unique event ID.

## Request format

- `Content-Type: application/json`
- `X-Respondo-Event-ID: <unique stable event id, 8–160 characters>`
- `X-Respondo-Timestamp: <Unix seconds, valid ±300 seconds>`
- `X-Respondo-Signature: sha256=<hex HMAC SHA-256>`
- Signature payload is the **exact UTF-8 bytes** of `timestamp + "." + raw JSON body`. Re-serializing the JSON after signing will invalidate the signature.
- Body limit: 30,000 bytes. Event IDs are replay protected per workspace in PostgreSQL.

### Order status event

```json
{"kind":"order_status","data":{"source":"manual","reference":"#A100","customerEmail":"buyer@example.com","status":"processing","currency":"EUR","totalCents":12000}}
```

The owner-configured sender is responsible for verifying the merchant's record before signing. Respondo marks this as a **seller-provided snapshot**, not real-time Shopify/WooCommerce verification. No payment, refund or shipping operation is made.

### Lead event

```json
{"kind":"lead_captured","data":{"name":"Anni","email":"anni@example.com","note":"Asked for a quote"}}
```

Creates an internal tenant-scoped Respondo CRM contact and follow-up task. It does not send an email or SMS.

## Zero-package Node.js sender example

```js
import {createHmac,randomUUID} from 'node:crypto';

const endpoint=process.env.RESPONDO_WEBHOOK_URL;
const secret=process.env.RESPONDO_WEBHOOK_SECRET;
if(!endpoint?.startsWith('https://respondoai.fi/api/webhooks/respondo-native/') ||
   !/^[a-f0-9]{64}$/.test(secret||''))throw Error('Configure the webhook URL and secret');

const payload={kind:'lead_captured',
  data:{name:'Example customer',email:'customer@example.com',note:'Requested a callback'}};
const body=JSON.stringify(payload);
const timestamp=String(Math.floor(Date.now()/1000));
const signature='sha256='+createHmac('sha256',secret)
  .update(timestamp+'.'+body,'utf8').digest('hex');
const result=await fetch(endpoint,{method:'POST',redirect:'error',
 headers:{'content-type':'application/json','x-respondo-event-id':randomUUID(),
  'x-respondo-timestamp':timestamp,'x-respondo-signature':signature},
 body});
if(!result.ok)throw Error('Webhook rejected: HTTP '+result.status);
console.log(await result.json());
```

**Retry safely:** use the **same event ID** for retries after timeouts; create a fresh timestamp and signature. The duplicate check prevents a second write.

## Safety

- Never include signing keys in chat messages, query strings, analytics, screenshots or commits.
- Inbound only: no paid AI model or external message provider is invoked.
- Signature, timestamp and event ID are mandatory. The transaction claims the ID and writes the order/contact atomically.
- Customer order status is only returned after valid website widget authorization and matching order email; no plaintext email is stored in the order ledger.
- Workspace-specific key can be revoked at any time.
- The sender must still follow applicable privacy and personal-data requirements.

## Unavailable without external authorization or costs

Carrier SMS/telephone calls, vendor-native Shopify and WooCommerce webhook validation, Outlook/Meta app registration, third-party billing, refunds and payment collection are **not activated** by this feature. Do not call them free merely because the internal Respondo handler has no added subscription.
