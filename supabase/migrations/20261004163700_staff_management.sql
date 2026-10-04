-- Server-only employee administration; never authorize from user_metadata.
alter table app.profiles add column version integer not null default 1 check (version > 0);
create table app.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  details jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error_code text,
  created_by uuid not null references app.profiles(id),
  created_at timestamptz not null default now()
);
comment on column app.staff_invitations.id is 'Reserved Auth user UUID; intentionally not a foreign key until Auth provisioning succeeds.';
alter table app.staff_invitations enable row level security;
revoke all on app.staff_invitations from public, anon, authenticated;
grant select, insert, update on app.staff_invitations to truckflow_runtime;
create policy runtime_service on app.staff_invitations for all to truckflow_runtime using (true) with check (true);
grant delete on app.staff_customer_access to truckflow_runtime;
