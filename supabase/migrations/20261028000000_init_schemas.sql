-- Initialize public and private schemas
-- One concern: Schema setup and extensions

-- Enable required extensions
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "pg_cron" with schema extensions;
create extension if not exists "pgtap" with schema extensions;
create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "pg_net" with schema extensions;

-- Create private schema for internal tables/functions
create schema if not exists private;
comment on schema private is 'Internal tables and functions not exposed via PostgREST';

-- Create job_runs table for scheduled job logging
create table if not exists private.job_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  started_at timestamp with time zone not null default now(),
  ended_at timestamp with time zone,
  status text not null default 'running' check (status in ('running', 'success', 'error')),
  rows_processed integer,
  rows_failed integer,
  error_message text,
  created_at timestamp with time zone not null default now()
);

create index idx_job_runs_job_name on private.job_runs(job_name);
create index idx_job_runs_created_at on private.job_runs(created_at desc);

comment on table private.job_runs is 'Logging table for scheduled jobs (pg_cron)';
comment on column private.job_runs.job_name is 'Name of the scheduled job';
comment on column private.job_runs.status is 'Job execution status: running, success, error';
comment on column private.job_runs.rows_processed is 'Number of rows successfully processed';
comment on column private.job_runs.rows_failed is 'Number of rows that failed processing';

-- Grant no direct access to private schema
revoke all on schema private from public;
revoke all on all tables in schema private from public;
revoke all on all functions in schema private from public;
