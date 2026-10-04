create schema app;
revoke all on schema app from public, anon, authenticated;
alter default privileges in schema app revoke all on tables from public, anon, authenticated;
alter default privileges in schema app revoke execute on functions from public, anon, authenticated;
do $$ begin
  if not exists(select 1 from pg_roles where rolname='truckflow_runtime') then
    create role truckflow_runtime login noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
  end if;
end $$;
grant usage on schema app to truckflow_runtime;
create sequence app.inquiry_number;
create sequence app.order_number;
create table app.customers (
 id uuid primary key default gen_random_uuid(), name text not null, contact text not null, email text not null, phone text not null,
 status text not null default 'active' check(status in ('active','frozen')), created_at timestamptz not null default now()
);
create table app.profiles (
 id uuid primary key references auth.users(id), name text not null, identity text not null check(identity in ('customer','staff')),
 customer_id uuid references app.customers(id), active boolean not null default true, roles text[] not null,
 all_customers boolean not null default false, created_at timestamptz not null default now(),
 check((identity='customer' and customer_id is not null and roles <@ array['customer_operator','customer_finance']::text[] and not all_customers) or
       (identity='staff' and customer_id is null and roles <@ array['operations','finance','admin','cost_view']::text[]))
);
create index profiles_customer_idx on app.profiles(customer_id);
create table app.staff_customer_access (
 staff_id uuid not null references app.profiles(id), customer_id uuid not null references app.customers(id), primary key(staff_id,customer_id)
);
create table app.invitations (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references app.customers(id), email text not null,
 name text not null, roles text[] not null check(roles <@ array['customer_operator','customer_finance']::text[]),
 status text not null default 'pending' check(status in ('pending','sent','accepted','failed')),
 user_id uuid references auth.users(id), created_by uuid not null references app.profiles(id), error_code text, created_at timestamptz not null default now(),
 unique(customer_id,email)
);
create index invitations_user_idx on app.invitations(user_id);
create table app.addresses (
 id uuid primary key default gen_random_uuid(), customer_id uuid references app.customers(id), scope text not null default 'private' check(scope in ('public','private')),
 data jsonb not null, version integer not null default 1 check(version>0), archived_at timestamptz, created_at timestamptz not null default now(),
 check((scope='private' and customer_id is not null) or (scope='public' and customer_id is null))
);
create index addresses_customer_idx on app.addresses(customer_id,created_at desc,id);
create table app.inquiries (
 id uuid primary key default gen_random_uuid(), number text not null unique default ('INQ-'||lpad(nextval('app.inquiry_number')::text,8,'0')),
 customer_id uuid not null references app.customers(id), created_by uuid not null references app.profiles(id), data jsonb not null,
 version integer not null default 1, status text not null default 'pending' check(status in ('pending','quoted','ordered','no_quote')),
 reason text, created_at timestamptz not null default now(), unique(customer_id,id)
);
create index inquiries_customer_idx on app.inquiries(customer_id,created_at desc,id);
create index inquiries_queue_idx on app.inquiries(status,created_at,id);
create table app.quotes (
 id uuid primary key default gen_random_uuid(), inquiry_id uuid not null, customer_id uuid not null,
 carrier text not null, fees jsonb not null, amount numeric(18,2) not null check(amount>0), currency text not null default 'USD' check(currency='USD'),
 expires_at timestamptz not null, transit text not null, evidence text not null, status text not null default 'draft' check(status in ('draft','published')),
 created_by uuid not null references app.profiles(id), published_at timestamptz, created_at timestamptz not null default now(),
 foreign key(customer_id,inquiry_id) references app.inquiries(customer_id,id), unique(customer_id,id), unique(customer_id,id,inquiry_id)
);
create index quotes_inquiry_idx on app.quotes(inquiry_id,created_at,id);
create table app.quote_costs (
 quote_id uuid primary key, customer_id uuid not null, amount numeric(18,2) not null check(amount>=0),
 foreign key(customer_id,quote_id) references app.quotes(customer_id,id)
);
create table app.accounts (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references app.customers(id), currency text not null default 'USD' check(currency='USD'),
 balance numeric(18,2) not null default 0, held_amount numeric(18,2) not null default 0,
 check(balance>=0 and held_amount>=0 and balance>=held_amount), unique(customer_id,currency), unique(customer_id,id)
);
create table app.orders (
 id uuid primary key default gen_random_uuid(), number text not null unique default ('TF-'||lpad(nextval('app.order_number')::text,8,'0')),
 customer_id uuid not null references app.customers(id), inquiry_id uuid not null unique, quote_id uuid not null,
 snapshot jsonb not null, amount numeric(18,2) not null check(amount>0), currency text not null default 'USD' check(currency='USD'),
 status text not null default 'pending_review' check(status in ('pending_review','submitting','accepted','failed','unknown')),
 fulfillment text not null default 'awaiting_pickup' check(fulfillment in ('awaiting_pickup','picked_up','in_transit','delivered')),
 version integer not null default 1, created_by uuid not null references app.profiles(id), assigned_to uuid references app.profiles(id),
 external_id text, tracking text, created_at timestamptz not null default now(),
 foreign key(customer_id,quote_id,inquiry_id) references app.quotes(customer_id,id,inquiry_id), unique(customer_id,id)
);
create index orders_customer_idx on app.orders(customer_id,created_at desc,id);
create index orders_queue_idx on app.orders(status,created_at,id);
create index orders_assigned_idx on app.orders(assigned_to);
create table app.idempotency_records (
 customer_id uuid not null references app.customers(id), operation text not null, key text not null, payload_hash text not null,
 order_id uuid not null, created_at timestamptz not null default now(), primary key(customer_id,operation,key),
 foreign key(customer_id,order_id) references app.orders(customer_id,id)
);
create table app.fund_holds (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null, account_id uuid not null, order_id uuid not null unique,
 amount numeric(18,2) not null check(amount>0), status text not null default 'held' check(status in ('held','captured','released')),
 foreign key(customer_id,account_id) references app.accounts(customer_id,id), foreign key(customer_id,order_id) references app.orders(customer_id,id)
);
create table app.attachments (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references app.customers(id), order_id uuid,
 kind text not null check(kind in ('recharge_proof','BOL','POD','other')), filename text not null, storage_path text not null unique,
 mime_type text not null, size_bytes integer not null check(size_bytes>0 and size_bytes<=3000000), customer_visible boolean not null default true,
 created_by uuid not null references app.profiles(id), created_at timestamptz not null default now(),
 foreign key(customer_id,order_id) references app.orders(customer_id,id), unique(customer_id,id)
);
create index attachments_order_idx on app.attachments(order_id);
create table app.recharge_requests (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references app.customers(id), amount numeric(18,2) not null check(amount>0),
 reference text not null, proof_id uuid not null unique, status text not null default 'pending' check(status in ('pending','verified','rejected')),
 received_amount numeric(18,2), bank_reference text, reason text, version integer not null default 1,
 verified_by uuid references app.profiles(id), created_by uuid not null references app.profiles(id), verified_at timestamptz, created_at timestamptz not null default now(),
 foreign key(customer_id,proof_id) references app.attachments(customer_id,id), check(status<>'verified' or (received_amount>0 and bank_reference is not null)), unique(customer_id,id)
);
create unique index verified_bank_reference_idx on app.recharge_requests(bank_reference) where status='verified';
create index recharges_customer_idx on app.recharge_requests(customer_id,created_at desc,id);
create index recharges_queue_idx on app.recharge_requests(status,created_at,id);
create table app.ledger_entries (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null, account_id uuid not null, order_id uuid, recharge_id uuid,
 event_key text not null unique, type text not null check(type in ('recharge','freeze','capture','release')),
 amount numeric(18,2) not null check(amount>0), balance_delta numeric(18,2) not null, held_delta numeric(18,2) not null,
 actor_id uuid not null references app.profiles(id), created_at timestamptz not null default now(),
 foreign key(customer_id,account_id) references app.accounts(customer_id,id), foreign key(customer_id,order_id) references app.orders(customer_id,id),
 foreign key(customer_id,recharge_id) references app.recharge_requests(customer_id,id)
);
create index ledger_customer_idx on app.ledger_entries(customer_id,created_at desc,id);
create table app.order_events (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references app.orders(id), actor_id uuid not null references app.profiles(id),
 event text not null, detail text not null, visibility text not null check(visibility in ('customer','internal')), created_at timestamptz not null default now()
);
create index events_order_idx on app.order_events(order_id,created_at,id);
create table app.audit_events (
 id uuid primary key default gen_random_uuid(), actor_id uuid not null references app.profiles(id), customer_id uuid references app.customers(id),
 action text not null, resource_id uuid, created_at timestamptz not null default now()
);
create index audit_resource_idx on app.audit_events(resource_id,created_at,id);
create table app.rate_limits (
 key text primary key, window_start timestamptz not null default now(), hits integer not null default 1
);
-- Session revocation is checked server-side against signed user/session claims.
-- Auth's internal schema is not granted to the application role.
create function app.session_active(p_user uuid,p_session uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from auth.sessions where id=p_session and user_id=p_user);
$$;
revoke all on function app.session_active(uuid,uuid) from public,anon,authenticated;
grant execute on function app.session_active(uuid,uuid) to truckflow_runtime;
do $$ declare t record; begin
 for t in select tablename from pg_tables where schemaname='app' loop
  execute format('alter table app.%I enable row level security',t.tablename);
  execute format('create policy runtime_service on app.%I to truckflow_runtime using (true) with check (true)',t.tablename);
 end loop;
end $$;
grant select,insert,update on all tables in schema app to truckflow_runtime;
revoke update on app.ledger_entries,app.audit_events,app.order_events from truckflow_runtime;
grant usage,select on all sequences in schema app to truckflow_runtime;
