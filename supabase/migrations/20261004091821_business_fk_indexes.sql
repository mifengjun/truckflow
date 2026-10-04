-- Cover ownership and actor foreign keys; preserve queue indexes for future workloads.
create index attachments_created_by_fk_idx on app.attachments (created_by);
create index attachments_customer_id_order_id_fk_idx on app.attachments (customer_id, order_id);
create index audit_events_actor_id_fk_idx on app.audit_events (actor_id);
create index audit_events_customer_id_fk_idx on app.audit_events (customer_id);
create index fund_holds_customer_id_account_id_fk_idx on app.fund_holds (customer_id, account_id);
create index fund_holds_customer_id_order_id_fk_idx on app.fund_holds (customer_id, order_id);
create index idempotency_records_customer_id_order_id_fk_idx on app.idempotency_records (customer_id, order_id);
create index inquiries_created_by_fk_idx on app.inquiries (created_by);
create index invitations_created_by_fk_idx on app.invitations (created_by);
create index ledger_entries_actor_id_fk_idx on app.ledger_entries (actor_id);
create index ledger_entries_customer_id_account_id_fk_idx on app.ledger_entries (customer_id, account_id);
create index ledger_entries_customer_id_order_id_fk_idx on app.ledger_entries (customer_id, order_id);
create index ledger_entries_customer_id_recharge_id_fk_idx on app.ledger_entries (customer_id, recharge_id);
create index order_events_actor_id_fk_idx on app.order_events (actor_id);
create index orders_created_by_fk_idx on app.orders (created_by);
create index orders_customer_id_quote_id_inquiry_id_fk_idx on app.orders (customer_id, quote_id, inquiry_id);
create index quote_costs_customer_id_quote_id_fk_idx on app.quote_costs (customer_id, quote_id);
create index quotes_created_by_fk_idx on app.quotes (created_by);
create index quotes_customer_id_inquiry_id_fk_idx on app.quotes (customer_id, inquiry_id);
create index recharge_requests_created_by_fk_idx on app.recharge_requests (created_by);
create index recharge_requests_customer_id_proof_id_fk_idx on app.recharge_requests (customer_id, proof_id);
create index recharge_requests_verified_by_fk_idx on app.recharge_requests (verified_by);
create index staff_customer_access_customer_id_fk_idx on app.staff_customer_access (customer_id);

-- One authentication identity belongs to one customer company in the first release.
create unique index invitations_email_identity_idx on app.invitations(lower(email));
create function app.user_id_for_email(p_email text) returns uuid language sql stable security definer set search_path='' as $$
 select id from auth.users where lower(email)=lower(p_email) limit 1;
$$;
revoke all on function app.user_id_for_email(text) from public,anon,authenticated;
grant execute on function app.user_id_for_email(text) to truckflow_runtime;
