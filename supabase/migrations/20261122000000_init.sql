-- Duddu Learn: online backup for a parent/teacher account.
-- A signed-in parent (Supabase Auth, email magic link) owns their children's rows.
-- Children never sign in. Only first names are stored. Deleting the account
-- (auth.users row) or the students removes everything through ON DELETE CASCADE.

create extension if not exists pgcrypto;

-- ---------- updated_at trigger ----------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------- students ----------

create table public.students (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  local_id    text not null,
  name        text not null check (char_length(name) between 1 and 40),
  colour      text,
  groep       text,
  teacher     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (owner, local_id)
);

comment on table public.students is 'A child profile owned by a parent/teacher account. First names only.';

create trigger students_updated_at
  before update on public.students
  for each row execute function public.set_updated_at();

-- ---------- completions ----------

create table public.completions (
  id            bigint generated always as identity primary key,
  owner         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  student_id    uuid not null references public.students (id) on delete cascade,
  client_id     uuid not null unique,
  kind          text not null check (kind in ('level', 'lesson', 'table_learn', 'table_test', 'test', 'book', 'tijd')),
  item          text not null,
  level         int,
  correct       int not null default 0,
  total         int not null default 0,
  stars         int,
  pct           int,
  completed_at  timestamptz not null default now()
);

comment on column public.completions.client_id is 'Generated on the device; makes outbox uploads idempotent.';

create index completions_student_time on public.completions (student_id, completed_at desc);
create index completions_owner on public.completions (owner);

-- ---------- student_state (full snapshot of a child''s local data) ----------

create table public.student_state (
  student_id  uuid primary key references public.students (id) on delete cascade,
  owner       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

create index student_state_owner on public.student_state (owner);

create trigger student_state_updated_at
  before update on public.student_state
  for each row execute function public.set_updated_at();

-- ---------- Row Level Security: a parent sees and changes only their own rows ----------

alter table public.students      enable row level security;
alter table public.completions   enable row level security;
alter table public.student_state enable row level security;

create policy students_select on public.students for select to authenticated using (owner = auth.uid());
create policy students_insert on public.students for insert to authenticated with check (owner = auth.uid());
create policy students_update on public.students for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy students_delete on public.students for delete to authenticated using (owner = auth.uid());

-- A completion may only point at a student the same parent owns.
create policy completions_select on public.completions for select to authenticated using (owner = auth.uid());
create policy completions_insert on public.completions for insert to authenticated
  with check (owner = auth.uid() and exists (select 1 from public.students s where s.id = student_id and s.owner = auth.uid()));
create policy completions_update on public.completions for update to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid() and exists (select 1 from public.students s where s.id = student_id and s.owner = auth.uid()));
create policy completions_delete on public.completions for delete to authenticated using (owner = auth.uid());

create policy student_state_select on public.student_state for select to authenticated using (owner = auth.uid());
create policy student_state_insert on public.student_state for insert to authenticated
  with check (owner = auth.uid() and exists (select 1 from public.students s where s.id = student_id and s.owner = auth.uid()));
create policy student_state_update on public.student_state for update to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid() and exists (select 1 from public.students s where s.id = student_id and s.owner = auth.uid()));
create policy student_state_delete on public.student_state for delete to authenticated using (owner = auth.uid());

-- ---------- progress summary per student (runs with the caller's rights, so RLS applies) ----------

create view public.student_progress
with (security_invoker = true)
as
select
  s.id                                                   as student_id,
  s.owner,
  s.local_id,
  s.name,
  s.groep,
  count(c.id)                                            as completions,
  count(c.id) filter (
    where c.kind in ('test', 'table_test')
      and c.total > 0
      and c.correct * 10 >= c.total * 8
  )                                                      as tests_passed,
  coalesce(max(c.completed_at), s.updated_at)            as last_activity
from public.students s
left join public.completions c on c.student_id = s.id
group by s.id;

comment on view public.student_progress is 'Per student: number of completions, tests passed (>= 80%), last activity.';

grant select, insert, update, delete on public.students, public.completions, public.student_state to authenticated;
grant select on public.student_progress to authenticated;

-- ---------- "delete my account": a parent removes their login and, by cascade, all data ----------

create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
