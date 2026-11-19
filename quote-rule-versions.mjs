import { tenantQuotePricing } from './smart-quote-guard.mjs';

const PAGE_SIZE = 15;
const MAX_VERSION = 2_147_483_647;

export async function ensureQuoteRuleVersionsSchema(db) {
  await db.query(`ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS
    quote_rule_version INTEGER NOT NULL DEFAULT 0 CHECK (quote_rule_version >= 0)`);
  await db.query(`CREATE TABLE IF NOT EXISTS public.respondo_quote_rule_versions (
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    version INTEGER NOT NULL CHECK (version > 0),
    snapshot JSONB NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
    recorded_at TIMESTAMPTZ,
    PRIMARY KEY (tenant_id,version)
  )`);
  await db.query('ALTER TABLE public.respondo_quote_rule_versions ENABLE ROW LEVEL SECURITY');
  await db.query('REVOKE ALL PRIVILEGES ON TABLE public.respondo_quote_rule_versions FROM PUBLIC');
  await db.query(`DO $quote_rule_history$
    DECLARE api_role TEXT;
    BEGIN
      FOREACH api_role IN ARRAY ARRAY['anon','authenticated','service_role']
      LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=api_role) THEN
          EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.respondo_quote_rule_versions FROM %I',api_role);
        END IF;
      END LOOP;
    END
  $quote_rule_history$`);
}

function readVersion(value, minimum) {
  if ((typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value))) ||
      !Number.isSafeInteger(Number(value)) || Number(value) < minimum || Number(value) > MAX_VERSION) {
    throw new RangeError('Invalid quote rule version');
  }
  return Number(value);
}

function snapshotFromTenant(tenant) {
  const pricing = tenantQuotePricing(tenant);
  const storedNumber = value => Number.isFinite(Number(value)) ? Number(value) : value;
  return {
    serviceName:tenant.quote_service_name ?? '',
    unitLabel:tenant.quote_unit_label || 'kpl',
    basePrice:storedNumber(pricing.base),
    unitPrice:storedNumber(pricing.unit),
    minPrice:storedNumber(pricing.minimum),
    vatPercent:storedNumber(pricing.vatPercent),
    discountOverQuantity:pricing.discountOverQuantity === null ? null : storedNumber(pricing.discountOverQuantity),
    discountPercent:storedNumber(pricing.discountPercent)
  };
}

export async function saveTenantQuoteRules(db, {tenantId, ownerId, serviceName, unitLabel, pricing, saveDiscount, expectedVersion}) {
  const expected = expectedVersion === undefined ? null : readVersion(expectedVersion,0);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const locked = await client.query(`SELECT quote_rule_version,quote_service_name,quote_base_price,quote_unit_price,
      quote_min_price,quote_vat_percent,quote_unit_label,quote_discount_over_quantity,quote_discount_percent
      FROM public.tenants WHERE id=$1 AND owner_user_id=$2 FOR UPDATE`, [tenantId,ownerId]);
    const tenant = locked.rows[0];
    if (!tenant) {
      await client.query('ROLLBACK');
      return null;
    }

    const current = snapshotFromTenant(tenant);
    const beforeVersion = tenant.quote_rule_version;
    const next = {
      serviceName,unitLabel,
      basePrice:pricing.base,unitPrice:pricing.unit,minPrice:pricing.minimum,vatPercent:pricing.vatPercent,
      discountOverQuantity:saveDiscount ? pricing.discountOverQuantity : current.discountOverQuantity,
      discountPercent:saveDiscount ? pricing.discountPercent : current.discountPercent
    };

    // A retry arriving after its own save is still a no-op, even if its
    // expected version now refers to the previous configuration.
    if (Object.keys(next).every(key => next[key] === current[key])) {
      await client.query('COMMIT');
      return {changed:false,ruleVersion:beforeVersion};
    }
    if (expected !== null && expected !== beforeVersion) {
      await client.query('ROLLBACK');
      return {conflict:true,ruleVersion:beforeVersion};
    }

    if (beforeVersion === 0) {
      await client.query(`INSERT INTO public.respondo_quote_rule_versions
        (tenant_id,version,snapshot,recorded_at) VALUES($1,1,$2::jsonb,NULL)`, [tenantId,JSON.stringify(current)]);
    }
    const ruleVersion = Math.max(1,beforeVersion) + 1;
    await client.query(`UPDATE public.tenants
      SET quote_service_name=$3,quote_base_price=$4,quote_unit_price=$5,
          quote_min_price=$6,quote_vat_percent=$7,quote_unit_label=$8,
          quote_discount_over_quantity=$9,quote_discount_percent=$10,quote_rule_version=$11,updated_at=NOW()
      WHERE id=$1 AND owner_user_id=$2`, [
      tenantId,ownerId,next.serviceName,next.basePrice,next.unitPrice,next.minPrice,
      next.vatPercent,next.unitLabel,next.discountOverQuantity,next.discountPercent,ruleVersion
    ]);
    await client.query(`INSERT INTO public.respondo_quote_rule_versions
      (tenant_id,version,snapshot,recorded_at) VALUES($1,$2,$3::jsonb,NOW())`, [tenantId,ruleVersion,JSON.stringify(next)]);
    await client.query('COMMIT');
    return {changed:true,ruleVersion};
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    throw error;
  } finally {
    client.release();
  }
}

export async function listTenantQuoteRuleVersions(db, {tenantId,ownerId,before}) {
  const cursor = before === undefined ? null : readVersion(before,1);
  const result = await db.query(`SELECT versions.version,versions.snapshot,versions.recorded_at
    FROM public.respondo_quote_rule_versions versions
    JOIN public.tenants tenant ON tenant.id=versions.tenant_id
    WHERE versions.tenant_id=$1 AND tenant.owner_user_id=$2
      AND ($3::integer IS NULL OR versions.version < $3)
    ORDER BY versions.version DESC LIMIT $4`, [tenantId,ownerId,cursor,PAGE_SIZE + 1]);
  const versions = result.rows.slice(0,PAGE_SIZE).map(row => ({
    version:row.version,
    pricing:row.snapshot,
    recordedAt:row.recorded_at
  }));
  return {versions,nextBefore:result.rows.length > PAGE_SIZE ? versions.at(-1).version : null};
}
