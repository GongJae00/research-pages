create extension if not exists pgcrypto;

create type public.membership_permission_level as enum ('owner', 'admin', 'member');
create type public.invite_status as enum ('pending', 'accepted', 'revoked');
create type public.shared_resource_type as enum ('document', 'paper', 'profile', 'schedule');

create table public.research_accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  korean_name text not null,
  english_name text,
  primary_email text not null unique,
  national_researcher_number text not null unique,
  created_on date not null default current_date
);

create table public.research_profiles (
  account_id uuid primary key references public.research_accounts (id) on delete cascade,
  display_name text,
  korean_name text,
  english_name text,
  legal_name text,
  preferred_name text,
  romanized_name text,
  headline text,
  secondary_email text,
  emails text[] not null default '{}',
  phone text,
  phones text[] not null default '{}',
  photo_data_url text,
  orcid text,
  primary_institution text,
  primary_discipline text,
  keywords text[] not null default '{}',
  links jsonb not null default '[]'::jsonb,
  public_profile_enabled boolean not null default false,
  public_profile_slug text,
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index research_profiles_public_profile_slug_idx
on public.research_profiles (lower(public_profile_slug))
where public_profile_slug is not null;

create table public.research_affiliations (
  owner_account_id uuid not null references public.research_accounts (id) on delete cascade,
  id text not null,
  institution_name text not null,
  department text,
  lab_name text,
  organization_type text not null,
  role_title text not null,
  role_track text not null,
  appointment_status text not null default 'active',
  start_date date not null,
  end_date date,
  active boolean not null default true,
  related_funding_ids text[] not null default '{}',
  notes text,
  primary key (owner_account_id, id)
);

create table public.research_funding_records (
  owner_account_id uuid not null references public.research_accounts (id) on delete cascade,
  id text not null,
  title text not null,
  source_type text not null,
  compensation_kind text not null,
  provider_name text not null,
  project_name text,
  currency text not null,
  amount numeric,
  cadence text not null default 'monthly',
  start_date date not null,
  end_date date,
  active boolean not null default true,
  linked_affiliation_id text,
  restrictions text[] not null default '{}',
  notes text,
  primary key (owner_account_id, id)
);

create table public.labs (
  id uuid primary key default gen_random_uuid(),
  owner_account_id uuid not null references public.research_accounts (id) on delete restrict,
  name text not null,
  slug text not null unique,
  summary text,
  homepage_title text,
  homepage_description text,
  public_page_enabled boolean not null default false,
  created_on date not null default current_date
);

create table public.lab_members (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references public.labs (id) on delete cascade,
  account_id uuid not null references public.research_accounts (id) on delete cascade,
  role_title text not null,
  sort_order integer not null default 0,
  permission_level public.membership_permission_level not null default 'member',
  can_manage_profile boolean not null default false,
  can_manage_documents boolean not null default false,
  can_manage_members boolean not null default false,
  joined_on date not null default current_date,
  unique (lab_id, account_id)
);

create table public.lab_invites (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references public.labs (id) on delete cascade,
  email text not null,
  national_researcher_number text not null,
  role_title text not null,
  permission_level public.membership_permission_level not null default 'member',
  invited_by_member_id uuid not null references public.lab_members (id) on delete cascade,
  invited_on date not null default current_date,
  status public.invite_status not null default 'pending',
  token text not null unique
);

create table public.shared_edit_locks (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references public.labs (id) on delete cascade,
  resource_type public.shared_resource_type not null,
  resource_title text not null,
  holder_account_id uuid not null references public.research_accounts (id) on delete cascade,
  active boolean not null default true,
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_account_id uuid not null references public.research_accounts (id) on delete cascade,
  title text not null,
  document_category text not null,
  document_type text not null,
  source_kind text not null,
  status text not null,
  visibility text not null default 'private',
  original_file_name text,
  mime_type text,
  file_extension text,
  file_size_bytes bigint,
  storage_path text,
  summary text,
  tags text[] not null default '{}',
  related_funding_ids text[] not null default '{}',
  related_affiliation_ids text[] not null default '{}',
  updated_on date not null default current_date
);

create table public.profile_evidence_links (
  account_id uuid not null references public.research_accounts (id) on delete cascade,
  evidence_key text not null,
  document_id text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (account_id, evidence_key, document_id)
);

create table public.lab_shared_documents (
  lab_id uuid not null references public.labs (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  shared_by_account_id uuid not null references public.research_accounts (id) on delete cascade,
  shared_at timestamptz not null default timezone('utc', now()),
  primary key (lab_id, document_id)
);

create table public.publications (
  id uuid primary key default gen_random_uuid(),
  owner_account_id uuid not null references public.research_accounts (id) on delete cascade,
  title text not null,
  journal_class text,
  journal_name text,
  publisher text,
  published_on date,
  author_role text,
  participants text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.lab_shared_publications (
  lab_id uuid not null references public.labs (id) on delete cascade,
  publication_id uuid not null references public.publications (id) on delete cascade,
  shared_by_account_id uuid not null references public.research_accounts (id) on delete cascade,
  shared_at timestamptz not null default timezone('utc', now()),
  primary key (lab_id, publication_id)
);

create table public.lab_research_projects (
  lab_id uuid not null references public.labs (id) on delete cascade,
  id text not null,
  title text not null,
  summary text,
  start_date date not null,
  end_date date,
  status text not null check (status in ('ongoing', 'completed')),
  program text not null,
  sponsor text not null,
  sort_order integer not null default 0,
  public_visible boolean not null default true,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (lab_id, id)
);

create table public.timetable_entries (
  id uuid primary key default gen_random_uuid(),
  owner_account_id uuid not null references public.research_accounts (id) on delete cascade,
  schedule_id uuid not null,
  course_title text not null,
  course_code text,
  kind text not null,
  location text,
  notes text,
  day_of_week text not null,
  start_time text not null,
  end_time text not null,
  term_id text,
  updated_on date not null default current_date
);

create table public.lab_shared_schedules (
  lab_id uuid not null references public.labs (id) on delete cascade,
  schedule_id uuid not null,
  shared_by_account_id uuid not null references public.research_accounts (id) on delete cascade,
  shared_at timestamptz not null default timezone('utc', now()),
  primary key (lab_id, schedule_id)
);

create table public.lab_timetable_entries (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references public.labs (id) on delete cascade,
  schedule_id uuid not null,
  course_title text not null,
  course_code text,
  kind text not null,
  location text,
  notes text,
  day_of_week text not null,
  start_time text not null,
  end_time text not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.activity_logs (
  id bigint generated always as identity primary key,
  lab_id uuid references public.labs (id) on delete cascade,
  actor_account_id uuid not null references public.research_accounts (id) on delete cascade,
  action text not null,
  resource_type text not null,
  resource_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index activity_logs_lab_id_created_at_idx
on public.activity_logs (lab_id, created_at desc);

create or replace function public.is_lab_member(target_lab_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.lab_members
    where lab_id = target_lab_id
      and account_id = auth.uid()
  );
$$;

create or replace function public.shares_lab_with(target_account_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.lab_members as current_member
    join public.lab_members as target_member
      on target_member.lab_id = current_member.lab_id
    where current_member.account_id = auth.uid()
      and target_member.account_id = target_account_id
  );
$$;

create or replace function public.is_profile_public(target_account_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.research_profiles
    where account_id = target_account_id
      and public_profile_enabled
      and public_profile_slug is not null
  );
$$;

create or replace function public.get_public_lab_page(target_slug text)
returns table (
  id uuid,
  name text,
  slug text,
  summary text,
  homepage_title text,
  homepage_description text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    lab.id,
    lab.name,
    lab.slug,
    lab.summary,
    lab.homepage_title,
    lab.homepage_description
  from public.labs as lab
  where lab.public_page_enabled
    and lower(lab.slug) = lower(target_slug)
  limit 1;
$$;

create or replace function public.get_public_lab_people(target_slug text)
returns table (
  member_id uuid,
  account_id uuid,
  role_title text,
  sort_order integer,
  korean_name text,
  english_name text,
  display_name text,
  headline text,
  photo_data_url text,
  primary_institution text,
  primary_discipline text,
  public_profile_slug text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    member.id as member_id,
    member.account_id,
    member.role_title,
    member.sort_order,
    account.korean_name,
    account.english_name,
    coalesce(
      profile.display_name,
      profile.korean_name,
      profile.english_name,
      account.korean_name,
      account.english_name,
      split_part(account.primary_email, '@', 1)
    ) as display_name,
    profile.headline,
    profile.photo_data_url,
    profile.primary_institution,
    profile.primary_discipline,
    profile.public_profile_slug
  from public.labs as lab
  join public.lab_members as member
    on member.lab_id = lab.id
  join public.research_accounts as account
    on account.id = member.account_id
  left join public.research_profiles as profile
    on profile.account_id = member.account_id
   and profile.public_profile_enabled
   and profile.public_profile_slug is not null
  where lab.public_page_enabled
    and lower(lab.slug) = lower(target_slug)
  order by member.sort_order asc,
           coalesce(account.korean_name, account.english_name, account.primary_email) asc;
$$;

create or replace function public.get_public_lab_papers(target_slug text)
returns table (
  id uuid,
  title text,
  journal_class text,
  journal_name text,
  publisher text,
  published_on date,
  author_role text,
  participants text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    publication.id,
    publication.title,
    publication.journal_class,
    publication.journal_name,
    publication.publisher,
    publication.published_on,
    publication.author_role,
    publication.participants
  from public.labs as lab
  join public.lab_shared_publications as shared_publication
    on shared_publication.lab_id = lab.id
  join public.publications as publication
    on publication.id = shared_publication.publication_id
  where lab.public_page_enabled
    and lower(lab.slug) = lower(target_slug)
  order by publication.published_on desc nulls last,
           publication.updated_at desc;
$$;

create or replace function public.get_public_lab_projects(target_slug text)
returns table (
  id text,
  title text,
  summary text,
  start_date date,
  end_date date,
  status text,
  program text,
  sponsor text,
  sort_order integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    project.id,
    project.title,
    project.summary,
    project.start_date,
    project.end_date,
    project.status,
    project.program,
    project.sponsor,
    project.sort_order
  from public.labs as lab
  join public.lab_research_projects as project
    on project.lab_id = lab.id
  where lab.public_page_enabled
    and lower(lab.slug) = lower(target_slug)
    and project.public_visible
  order by
    case when project.status = 'ongoing' then 0 else 1 end,
    project.sort_order asc,
    project.start_date desc,
    project.end_date desc nulls last;
$$;

grant execute on function public.get_public_lab_page(text) to anon, authenticated;
grant execute on function public.get_public_lab_people(text) to anon, authenticated;
grant execute on function public.get_public_lab_papers(text) to anon, authenticated;
grant execute on function public.get_public_lab_projects(text) to anon, authenticated;

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.research_accounts (
    id,
    korean_name,
    english_name,
    primary_email,
    national_researcher_number,
    created_on
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'korean_name', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'english_name', ''),
    coalesce(new.email, new.raw_user_meta_data ->> 'primary_email'),
    coalesce(new.raw_user_meta_data ->> 'national_researcher_number', 'pending-' || left(new.id::text, 8)),
    current_date
  )
  on conflict (id) do update
    set korean_name = excluded.korean_name,
        english_name = excluded.english_name,
        primary_email = excluded.primary_email,
        national_researcher_number = excluded.national_researcher_number;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_auth_user_created();

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update
set public = excluded.public;

alter table public.research_accounts enable row level security;
alter table public.research_profiles enable row level security;
alter table public.research_affiliations enable row level security;
alter table public.research_funding_records enable row level security;
alter table public.labs enable row level security;
alter table public.lab_members enable row level security;
alter table public.lab_invites enable row level security;
alter table public.shared_edit_locks enable row level security;
alter table public.documents enable row level security;
alter table public.profile_evidence_links enable row level security;
alter table public.lab_shared_documents enable row level security;
alter table public.publications enable row level security;
alter table public.lab_shared_publications enable row level security;
alter table public.lab_research_projects enable row level security;
alter table public.timetable_entries enable row level security;
alter table public.lab_shared_schedules enable row level security;
alter table public.lab_timetable_entries enable row level security;
alter table public.activity_logs enable row level security;

create policy "accounts select self"
on public.research_accounts
for select
using (id = auth.uid());

create policy "accounts update self"
on public.research_accounts
for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "accounts insert self"
on public.research_accounts
for insert
with check (id = auth.uid());

create policy "profiles readable by owner"
on public.research_profiles
for select
using (account_id = auth.uid());

create policy "profiles readable when public"
on public.research_profiles
for select
using (public_profile_enabled and public_profile_slug is not null);

create policy "profiles inserted by owner"
on public.research_profiles
for insert
with check (account_id = auth.uid());

create policy "profiles updated by owner"
on public.research_profiles
for update
using (account_id = auth.uid())
with check (account_id = auth.uid());

create policy "profiles deleted by owner"
on public.research_profiles
for delete
using (account_id = auth.uid());

create policy "affiliations readable by owner"
on public.research_affiliations
for select
using (
  owner_account_id = auth.uid()
  or public.is_profile_public(owner_account_id)
);

create policy "affiliations inserted by owner"
on public.research_affiliations
for insert
with check (owner_account_id = auth.uid());

create policy "affiliations updated by owner"
on public.research_affiliations
for update
using (owner_account_id = auth.uid())
with check (owner_account_id = auth.uid());

create policy "affiliations deleted by owner"
on public.research_affiliations
for delete
using (owner_account_id = auth.uid());

create policy "funding readable by owner"
on public.research_funding_records
for select
using (owner_account_id = auth.uid());

create policy "funding inserted by owner"
on public.research_funding_records
for insert
with check (owner_account_id = auth.uid());

create policy "funding updated by owner"
on public.research_funding_records
for update
using (owner_account_id = auth.uid())
with check (owner_account_id = auth.uid());

create policy "funding deleted by owner"
on public.research_funding_records
for delete
using (owner_account_id = auth.uid());

create policy "labs readable by members"
on public.labs
for select
using (
  owner_account_id = auth.uid()
  or public.is_lab_member(id)
);

create policy "labs created by owner"
on public.labs
for insert
with check (owner_account_id = auth.uid());

create policy "labs updated by owner or admins"
on public.labs
for update
using (
  owner_account_id = auth.uid()
  or exists (
    select 1
    from public.lab_members
    where lab_id = labs.id
      and account_id = auth.uid()
      and permission_level in ('owner', 'admin')
  )
)
with check (
  owner_account_id = auth.uid()
  or exists (
    select 1
    from public.lab_members
    where lab_id = labs.id
      and account_id = auth.uid()
      and permission_level in ('owner', 'admin')
  )
);

create policy "lab members readable by members"
on public.lab_members
for select
using (
  public.is_lab_member(lab_id)
  or exists (
    select 1
    from public.labs
    where id = lab_id
      and owner_account_id = auth.uid()
  )
);

create policy "lab members inserted by managers or lab owners"
on public.lab_members
for insert
with check (
  exists (
    select 1
    from public.lab_members as manager
    where manager.lab_id = lab_members.lab_id
      and manager.account_id = auth.uid()
      and manager.can_manage_members
  )
  or exists (
    select 1
    from public.labs
    where id = lab_members.lab_id
      and owner_account_id = auth.uid()
      and lab_members.account_id = auth.uid()
      and lab_members.permission_level = 'owner'
  )
);

create policy "lab members updated by managers"
on public.lab_members
for update
using (
  exists (
    select 1
    from public.lab_members as manager
    where manager.lab_id = lab_members.lab_id
      and manager.account_id = auth.uid()
      and manager.can_manage_members
  )
)
with check (
  exists (
    select 1
    from public.lab_members as manager
    where manager.lab_id = lab_members.lab_id
      and manager.account_id = auth.uid()
      and manager.can_manage_members
  )
);

create policy "lab members deleted by managers"
on public.lab_members
for delete
using (
  exists (
    select 1
    from public.lab_members as manager
    where manager.lab_id = lab_members.lab_id
      and manager.account_id = auth.uid()
      and manager.can_manage_members
  )
);

create policy "lab invites readable by managers"
on public.lab_invites
for select
using (
  exists (
    select 1
    from public.lab_members
    where lab_id = lab_invites.lab_id
      and account_id = auth.uid()
      and can_manage_members
  )
);

create policy "lab invites managed by managers"
on public.lab_invites
for all
using (
  exists (
    select 1
    from public.lab_members
    where lab_id = lab_invites.lab_id
      and account_id = auth.uid()
      and can_manage_members
  )
)
with check (
  exists (
    select 1
    from public.lab_members
    where lab_id = lab_invites.lab_id
      and account_id = auth.uid()
      and can_manage_members
  )
);

create policy "locks readable by lab members"
on public.shared_edit_locks
for select
using (public.is_lab_member(lab_id));

create policy "locks managed by lab members"
on public.shared_edit_locks
for all
using (public.is_lab_member(lab_id))
with check (public.is_lab_member(lab_id));

create policy "documents readable by owner or shared lab members"
on public.documents
for select
using (
  owner_account_id = auth.uid()
  or exists (
    select 1
    from public.lab_shared_documents
    where document_id = documents.id
      and public.is_lab_member(lab_id)
  )
);

create policy "documents inserted by owner"
on public.documents
for insert
with check (owner_account_id = auth.uid());

create policy "documents updated by owner"
on public.documents
for update
using (owner_account_id = auth.uid())
with check (owner_account_id = auth.uid());

create policy "profile evidence readable by owner or shared lab members"
on public.profile_evidence_links
for select
using (
  account_id = auth.uid()
  or public.shares_lab_with(account_id)
);

create policy "profile evidence managed by owner"
on public.profile_evidence_links
for all
using (account_id = auth.uid())
with check (account_id = auth.uid());

create policy "shared documents visible to lab members"
on public.lab_shared_documents
for select
using (public.is_lab_member(lab_id));

create policy "shared documents managed by document managers"
on public.lab_shared_documents
for all
using (
  exists (
    select 1
    from public.lab_members
    where lab_id = lab_shared_documents.lab_id
      and account_id = auth.uid()
      and can_manage_documents
  )
)
with check (
  exists (
    select 1
    from public.lab_members
    where lab_id = lab_shared_documents.lab_id
      and account_id = auth.uid()
      and can_manage_documents
  )
);

create policy "publications readable by owner or shared lab members"
on public.publications
for select
using (
  owner_account_id = auth.uid()
  or public.is_profile_public(owner_account_id)
  or exists (
    select 1
    from public.lab_shared_publications
    where publication_id = publications.id
      and public.is_lab_member(lab_id)
  )
);

create policy "publications managed by owner"
on public.publications
for all
using (owner_account_id = auth.uid())
with check (owner_account_id = auth.uid());

create policy "shared publications visible to lab members"
on public.lab_shared_publications
for select
using (public.is_lab_member(lab_id));

create policy "shared publications managed by document managers"
on public.lab_shared_publications
for all
using (
  exists (
    select 1
    from public.lab_members
    where lab_id = lab_shared_publications.lab_id
      and account_id = auth.uid()
      and can_manage_documents
  )
)
with check (
  exists (
    select 1
    from public.lab_members
    where lab_id = lab_shared_publications.lab_id
      and account_id = auth.uid()
      and can_manage_documents
  )
);

create policy "lab research projects visible to lab members"
on public.lab_research_projects
for select
using (public.is_lab_member(lab_id));

create policy "lab research projects managed by profile managers"
on public.lab_research_projects
for all
using (
  exists (
    select 1
    from public.lab_members
    where lab_id = lab_research_projects.lab_id
      and account_id = auth.uid()
      and can_manage_profile
  )
)
with check (
  exists (
    select 1
    from public.lab_members
    where lab_id = lab_research_projects.lab_id
      and account_id = auth.uid()
      and can_manage_profile
  )
);

create policy "timetable readable by owner or shared lab members"
on public.timetable_entries
for select
using (
  owner_account_id = auth.uid()
  or exists (
    select 1
    from public.lab_shared_schedules
    where schedule_id = timetable_entries.schedule_id
      and public.is_lab_member(lab_id)
  )
);

create policy "timetable managed by owner"
on public.timetable_entries
for all
using (owner_account_id = auth.uid())
with check (owner_account_id = auth.uid());

create policy "shared schedules visible to lab members"
on public.lab_shared_schedules
for select
using (public.is_lab_member(lab_id));

create policy "shared schedules managed by document managers"
on public.lab_shared_schedules
for all
using (
  exists (
    select 1
    from public.lab_members
    where lab_id = lab_shared_schedules.lab_id
      and account_id = auth.uid()
      and can_manage_documents
  )
)
with check (
  exists (
    select 1
    from public.lab_members
    where lab_id = lab_shared_schedules.lab_id
      and account_id = auth.uid()
      and can_manage_documents
  )
);

create policy "lab timetable visible to lab members"
on public.lab_timetable_entries
for select
using (public.is_lab_member(lab_id));

create policy "lab timetable managed by document managers"
on public.lab_timetable_entries
for all
using (
  exists (
    select 1
    from public.lab_members
    where lab_id = lab_timetable_entries.lab_id
      and account_id = auth.uid()
      and can_manage_documents
  )
)
with check (
  exists (
    select 1
    from public.lab_members
    where lab_id = lab_timetable_entries.lab_id
      and account_id = auth.uid()
      and can_manage_documents
  )
);

create policy "activity logs visible to lab members"
on public.activity_logs
for select
using (lab_id is not null and public.is_lab_member(lab_id));

create policy "activity logs writable by lab members"
on public.activity_logs
for insert
with check (
  lab_id is not null
  and actor_account_id = auth.uid()
  and public.is_lab_member(lab_id)
);

create policy "document storage readable by owner or shared lab members"
on storage.objects
for select
using (
  bucket_id = 'documents'
  and exists (
    select 1
    from public.documents
    where storage_path = bucket_id || '/' || name
      and (
        owner_account_id = auth.uid()
        or exists (
          select 1
          from public.lab_shared_documents
          where document_id = documents.id
            and public.is_lab_member(lab_id)
        )
      )
  )
);

create policy "document storage inserted by owner"
on storage.objects
for insert
with check (
  bucket_id = 'documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "document storage updated by owner"
on storage.objects
for update
using (
  bucket_id = 'documents'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "document storage deleted by owner"
on storage.objects
for delete
using (
  bucket_id = 'documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

alter publication supabase_realtime add table public.labs;
alter publication supabase_realtime add table public.lab_members;
alter publication supabase_realtime add table public.lab_invites;
alter publication supabase_realtime add table public.shared_edit_locks;
alter publication supabase_realtime add table public.documents;
alter publication supabase_realtime add table public.profile_evidence_links;
alter publication supabase_realtime add table public.lab_shared_documents;
alter publication supabase_realtime add table public.publications;
alter publication supabase_realtime add table public.lab_shared_publications;
alter publication supabase_realtime add table public.lab_research_projects;
alter publication supabase_realtime add table public.lab_shared_schedules;
alter publication supabase_realtime add table public.lab_timetable_entries;
alter publication supabase_realtime add table public.activity_logs;
