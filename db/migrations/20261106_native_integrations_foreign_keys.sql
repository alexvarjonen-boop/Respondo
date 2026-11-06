-- Respondo first-party integration foreign-key indexes.
-- Applied to production Supabase via the migration manager on 2026-11-06.
-- Idempotent, non-destructive, no data modification or external services.
-- Supabase advisor 'unindexed_foreign_keys' = 0 after application.

CREATE INDEX IF NOT EXISTS idx_respondo_free_workflow_approvals_workflow_id ON public.respondo_free_workflow_approvals (workflow_id);
CREATE INDEX IF NOT EXISTS idx_respondo_free_workflow_runs_workflow_id ON public.respondo_free_workflow_runs (workflow_id);
CREATE INDEX IF NOT EXISTS idx_respondo_freshdesk_exports_native_ticket_id ON public.respondo_freshdesk_exports (native_ticket_id);
CREATE INDEX IF NOT EXISTS idx_respondo_native_calendar_events_action_request_id ON public.respondo_native_calendar_events (action_request_id);
CREATE INDEX IF NOT EXISTS idx_respondo_native_calendar_events_slot_id ON public.respondo_native_calendar_events (slot_id);
CREATE INDEX IF NOT EXISTS idx_respondo_native_crm_imports_contact_id ON public.respondo_native_crm_imports (contact_id);
CREATE INDEX IF NOT EXISTS idx_respondo_native_documents_tenant_id ON public.respondo_native_documents (tenant_id);
CREATE INDEX IF NOT EXISTS idx_respondo_native_inbox_deliveries_thread_id ON public.respondo_native_inbox_deliveries (thread_id);
CREATE INDEX IF NOT EXISTS idx_respondo_native_inbox_drafts_thread_id ON public.respondo_native_inbox_drafts (thread_id);
CREATE INDEX IF NOT EXISTS idx_respondo_native_inbox_notes_thread_id ON public.respondo_native_inbox_notes (thread_id);
CREATE INDEX IF NOT EXISTS idx_respondo_native_mail_deliveries_thread_id ON public.respondo_native_mail_deliveries (thread_id);
CREATE INDEX IF NOT EXISTS idx_respondo_native_meta_deliveries_thread_id ON public.respondo_native_meta_deliveries (thread_id);
CREATE INDEX IF NOT EXISTS idx_respondo_native_quotes_tenant_id ON public.respondo_native_quotes (tenant_id);
CREATE INDEX IF NOT EXISTS idx_respondo_native_runs_rule_id ON public.respondo_native_runs (rule_id);
CREATE INDEX IF NOT EXISTS idx_respondo_quality_aliases_conversation_id ON public.respondo_quality_aliases (conversation_id);
CREATE INDEX IF NOT EXISTS idx_respondo_quality_aliases_source_knowledge_id ON public.respondo_quality_aliases (source_knowledge_id);
CREATE INDEX IF NOT EXISTS idx_respondo_quality_reviews_conversation_id ON public.respondo_quality_reviews (conversation_id);
CREATE INDEX IF NOT EXISTS idx_respondo_zendesk_exports_native_ticket_id ON public.respondo_zendesk_exports (native_ticket_id);
CREATE INDEX IF NOT EXISTS idx_respondo_zendesk_oauth_states_tenant_id ON public.respondo_zendesk_oauth_states (tenant_id);
