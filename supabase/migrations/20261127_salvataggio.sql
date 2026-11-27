-- Un solo account: l'email ammessa si inserisce a mano, non sta nel repository:
--   insert into privato.ammesso values ('...');
create table privato.ammesso (email text primary key);
create table privato.account (
  uno boolean primary key default true check (uno),
  email text not null,
  hash text not null,
  creato timestamptz not null default now()
);
create table privato.sessioni (token_hash text primary key, creata timestamptz not null default now());
create table privato.tentativi (quando timestamptz not null default now());
create table privato.diario (
  uno boolean primary key default true check (uno),
  versione int not null default 0,
  dati jsonb not null default '{}',
  aggiornato timestamptz not null default now()
);
insert into privato.diario default values;
create table privato.foto (
  id text primary key,
  giorno date not null,
  nota text not null default '',
  img bytea,
  tolta boolean not null default false,
  creata timestamptz not null default now()
);
alter table privato.ammesso enable row level security;
alter table privato.account enable row level security;
alter table privato.sessioni enable row level security;
alter table privato.tentativi enable row level security;
alter table privato.diario enable row level security;
alter table privato.foto enable row level security;
