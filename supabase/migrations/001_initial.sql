-- Enums
create type submission_status as enum ('not_started','in_progress','submitted','reviewing','released');
create type stage as enum ('ninez','adolescencia','juventud','vejez');
create type answer_value as enum ('si','no');
create type cluster as enum ('emocional','motriz','racional','universal');

-- Coach (single row)
create table coach (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null default '',
  logo_url text
);

-- Settings (single row, id = 1)
create table settings (
  id int primary key default 1 check (id = 1),
  auto_release bool not null default false
);
insert into settings (id, auto_release) values (1, false);

-- Personality types
create table personality_types (
  id serial primary key,
  slug text not null unique,
  name text not null,
  cluster cluster not null,
  default_cartilla jsonb not null default '{}'
);

-- Traits
create table traits (
  id uuid primary key default gen_random_uuid(),
  type_id int not null references personality_types(id) on delete cascade,
  position int not null,
  text text not null,
  unique (type_id, position)
);

-- Clients
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  token text not null unique,
  internal_notes text,
  created_at timestamptz not null default now()
);

-- Submissions (one per client)
create table submissions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references clients(id) on delete cascade,
  status submission_status not null default 'not_started',
  submitted_at timestamptz,
  released_at timestamptz,
  coach_note text,
  cartilla_override jsonb not null default '{}'
);

-- Answers
create table answers (
  submission_id uuid not null references submissions(id) on delete cascade,
  trait_id uuid not null references traits(id) on delete cascade,
  stage stage not null,
  value answer_value,
  original_value answer_value,  -- immutable client answer, set on submit
  is_coach_edit bool not null default false,
  primary key (submission_id, trait_id, stage)
);

-- Indexes
create index on clients (token);
create index on answers (submission_id);
