create table if not exists public.certification_submissions (
  id uuid primary key default gen_random_uuid(),
  dossier_id text not null unique check (dossier_id ~ '^DCCO-CANDIDATE-[0-9]{4}-[A-Z0-9_-]{2,20}$'),
  certification_id text not null check (certification_id = 'DCCO-1'),
  candidate_name text not null,
  candidate_fingerprint text not null check (candidate_fingerprint ~ '^[a-f0-9]{64}$'),
  dossier_digest text not null check (dossier_digest ~ '^[a-f0-9]{64}$'),
  signed_bundle jsonb not null,
  status text not null default 'pending' check (status in ('pending','reviewing','approved','rejected','withdrawn')),
  reviewer_notes text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.certification_credentials (
  credential_id text primary key check (credential_id ~ '^DCCO-[0-9]{4}-[A-Z0-9]{8}$'),
  certification_id text not null check (certification_id = 'DCCO-1'),
  certification_title text not null default 'DaemonCore Certified Cyber Operator',
  holder_name text not null,
  issued_at timestamptz not null,
  expires_at timestamptz not null check (expires_at > issued_at),
  status text not null default 'active' check (status in ('active','expired','suspended','revoked')),
  policy_version integer not null default 1 check (policy_version > 0),
  dossier_digest text not null check (dossier_digest ~ '^[a-f0-9]{64}$'),
  issuer_key_id text not null,
  issuer_signature text not null,
  revoked_at timestamptz,
  revocation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.certification_submissions enable row level security;
alter table public.certification_credentials enable row level security;

revoke all on public.certification_submissions from anon, authenticated;
revoke all on public.certification_credentials from anon, authenticated;

create or replace function public.verify_certification(input_credential_id text)
returns table (
  credential_id text,
  certification_id text,
  certification_title text,
  holder_name text,
  issued_at timestamptz,
  expires_at timestamptz,
  status text,
  policy_version integer,
  issuer_key_id text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    credential.credential_id,
    credential.certification_id,
    credential.certification_title,
    credential.holder_name,
    credential.issued_at,
    credential.expires_at,
    case
      when credential.status = 'active' and credential.expires_at <= now() then 'expired'
      else credential.status
    end,
    credential.policy_version,
    credential.issuer_key_id
  from public.certification_credentials as credential
  where credential.credential_id = upper(trim(input_credential_id));
$$;

revoke all on function public.verify_certification(text) from public;
grant execute on function public.verify_certification(text) to anon, authenticated;

create index if not exists certification_submissions_status_idx on public.certification_submissions (status, submitted_at);
create index if not exists certification_credentials_status_idx on public.certification_credentials (status, expires_at);

comment on table public.certification_submissions is 'Private signed DCCO candidate dossiers. Service-role review only.';
comment on table public.certification_credentials is 'Issuer-controlled DCCO credential registry. Public access is restricted to verify_certification().';
