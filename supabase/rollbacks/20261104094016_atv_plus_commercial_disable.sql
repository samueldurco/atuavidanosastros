-- Forward fix / operational rollback. Preserve paid terms, audit, PDFs and receipts.
-- Re-enabling requires the original independent commercial/editorial/channel approvals.
begin;
update public.atv_plus_commercial_offers set commercial_enabled=false;
update public.atv_plus_release_gates set channel_enabled=false,generation_enabled=false;
update public.atv_plus_deliveries set state='BLOCKED',gate_code='commercial_release_disabled'
 where state in ('SCHEDULED','QUEUED','PROCESSING','READY','RETRY');
update public.atv_plus_deliveries set gate_code='delivery_reconciliation_required' where state in ('SENDING','SENT');
update public.jobs set state='CANCELLED',last_error_code='commercial_release_disabled'
 where job_type='atv_plus.generate' and state in ('QUEUED','RETRY','RUNNING');
commit;
