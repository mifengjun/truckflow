alter table app.customers add column source text not null default 'admin_created' check (source in ('admin_created','self_signup'));
