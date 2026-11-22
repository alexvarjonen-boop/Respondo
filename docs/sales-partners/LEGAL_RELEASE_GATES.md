# Respondo AI — compliance check and private rollout (2026-11-22)

**Internal preparation document. Not a lawyer's opinion. Do NOT publish recruitment notices or invite partners yet.**

## Confirmed environment
- Tmi Movexa / Respondo AI, public website `respondoai.fi`.
- Railway production service is sourced from GitHub `production-respondo-fi`.
- Supabase PostgreSQL 17.6 contains `users`, `tenants`, `stripe_webhook_events`; sales-partner tables were not present at the initial read-only review.
- Only the owner's `/sales-admin.html` interface may operate in PREPARATION mode. Partner registrations, attribution, commission creation, invitations, and payment-state changes all remain disabled until legal approval.
- No public recruitment landing page is included. Recruitment copy stays in the owner's private document package.

## Finnish legal and taxation review — findings
1. The Finnish work relationship classification is based on actual working conditions. In particular, the right to direct and supervise work may create an employment relationship even with flexible hours, commission-only pay and invoices from a kevytyrittäjä platform.
   - https://www.vero.fi/yritykset-ja-yhteisot/yritystoiminta/palkansaaja-vai-yrittaja/yrittajyyden-ja-tyosuhteen-tunnusmerkkeja/
   - https://www.finlex.fi/fi/oikeuskaytanto/vakuutusoikeus/2026/607-2025
2. If contractors are genuinely independent, normal employer registration is not required merely to buy their services. Employer registration can be triggered where employees are in fact hired; there are employer duties even without register membership.
   - https://www.vero.fi/yritykset-ja-yhteisot/verot-ja-maksut/yritys_tyonantajana/tyonantajarekisteri/
3. For independent work compensation, whether the payee is listed in the prepayment register affects withholding, and compensation to an unregistered payee may need reporting to the Incomes Register. Invoice platform semantics must be verified *per provider*.
   - https://vero.fi/tulorekisteri/yritykset-ja-organisaatiot/suorituksen-maksajat/palkkatiedot/ty%C3%B6korvaukset/
   - https://www.vero.fi/henkiloasiakkaat/verokortti-ja-veroilmoitus/tulot/ansiotulot/tyosuhteessa_vai_yrittaja/
4. B2B cold calls must be commercially transparent, respect the recipient's restrictions and marketing refusals, and process contact data on a documented legal basis with suitable data-subject information. **A corporate employee's direct contact information is personal data.** Assess controller/processor roles and whether a data processing agreement is needed.
5. Referral tracking must not start as a background marketing cookie. A separate customer opt-in landing page now controls an expiring, signed 30-day cookie. Review exact notices, retention and consent withdrawal mechanism with privacy counsel.

## Partner operating model proposed for legal review
- A separate independent contracting business, potentially using a suitable light-entrepreneur invoicing platform, performs B2B prospecting and sales.
- No fixed shifts, call quotas, exclusivity, minimum hours or forced appointment acceptance.
- Respondo AI supplies approved product claims, safety/privacy policies and a voluntary sales guide, not detailed work supervision.
- €50 ex applicable invoice VAT per first attributable paid annual recurring plan after free trial. No monthly, free, setup-only, duplicate or renewal commission. Refunds and direct charge reversals require individual checking before payout.
- Invoicing is monthly; owner manually approves commissions from verified Stripe records and records a real external invoice/payment reference.
- Partner has restricted private access to own business leads and commission ledger only.

## Before the program can OPEN — mandatory sign-offs
- [ ] Licensed/qualified Finnish employment-law adviser reviews **actual** work model, instructions, supervision, partner independence, contract, termination, and assignment.
- [ ] Accountant/tax professional reviews Tmi Movexa's business registration, payroll/work-compensation distinction, invoicing through each contemplated provider, prepayment register checks, withholding, Incomes Register, VAT, YEL and bookkeeping.
- [ ] Privacy specialist or competent DPO reviews B2B prospecting, opt-out recording/suppression, roles, controller/processor responsibilities, retention, consent copy and cookie compliance.
- [ ] Tmi Movexa's complete company identification and contractual party details are added to the *final* signed document; change the displayed `myyntikumppani-ehdot.html` draft to approved text before setting contract version.
- [ ] Create and evidence an approved, versioned contracting document and acceptance procedure. Do not activate on current `2026-11-22-draft-v1`.
- [ ] Verify actual Stripe receipts/coupons/refunds in a separate test environment and prove idempotent commission accounting with real webhooks.
- [ ] Confirm partners' account verification, account recovery, support process and deletion/retention operations.
- [ ] Owner explicitly approves opening individual invitations; **opening public recruitment ads remains separately forbidden until a fresh express instruction.**

## Safe technical controls
- `SALES_PARTNER_PREP_ENABLED=1` enables owner **read-only** preparation UI and private database schema.
- `SALES_PARTNER_PROGRAM_ENABLED=0` keeps the entire recruitment/referral program OFF.
- `SALES_PARTNER_LEGAL_APPROVED=0` independently blocks launch.
- `SALES_PARTNER_CONTRACT_VERSION=2026-11-22-draft-v1` is a third block.
- The public `/myyntikumppaniksi.html` job advert is not deployed.
- The private owner page is `/sales-admin.html`. Partner pages and consent pages may be present in code, but consent and activation APIs are disabled in preparation mode.
- No automatic bank transfer or unsolicited applicant messaging exists.

## Post-review go/no-go verification
1. Have lawyer/accountant sign-off documents, update the final contract and label its correct version.
2. Run regression suite + full Stripe webhook integration against an isolated staging DB.
3. Verify owner can issue one test invitation but users cannot access unrelated data.
4. Confirm opt-out, duplicate company and credit note edge cases in testing.
5. Activate env variables only after explicit confirmation; keep public advertisement unpublished.
