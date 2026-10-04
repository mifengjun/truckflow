-- A magic-link signup has an internal random password, so the existence of a
-- password hash alone does not prove that the customer has set a login password.
create table app.registration_passwords (
  user_id uuid primary key references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now()
);
alter table app.registration_passwords enable row level security;
create policy runtime_read on app.registration_passwords for select to truckflow_runtime using (true);
grant select on app.registration_passwords to truckflow_runtime;
revoke all on app.registration_passwords from public, anon, authenticated;

-- Preserve accounts from the previous password-first registration flow.
insert into app.registration_passwords(user_id)
select id from auth.users where coalesce(encrypted_password, '') <> '';

-- Only an actual password change after verification completes the new flow.
-- This private trigger cannot be called by clients or the application role.
create function app.record_registration_password() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into app.registration_passwords(user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function app.record_registration_password() from public, anon, authenticated, truckflow_runtime;
create trigger record_registration_password after update of encrypted_password on auth.users
for each row when (
  old.email_confirmed_at is not null
  and new.encrypted_password is distinct from old.encrypted_password
  and coalesce(new.encrypted_password, '') <> ''
) execute function app.record_registration_password();
