create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Schema non esposto dall'API: ci arriva solo la funzione, collegandosi al database.
create schema privato;
revoke all on schema privato from public, anon, authenticated;

create table privato.segreti (nome text primary key, valore text not null);
alter table privato.segreti enable row level security;
insert into privato.segreti values ('cron', encode(extensions.gen_random_bytes(32), 'hex'));

create table privato.iscrizioni (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  ora time not null default '19:00',
  fuso text not null default 'Europe/Rome',
  inviata date,
  ultima_prova timestamptz,
  creata timestamptz not null default now()
);
alter table privato.iscrizioni enable row level security;

-- Chi deve ricevere il promemoria adesso: ora passata da meno di due ore e non ancora inviato oggi.
create view privato.da_inviare with (security_invoker = true) as
  select endpoint, locale::date as giorno
  from (select *, now() at time zone fuso as locale from privato.iscrizioni) i
  where locale >= locale::date + ora
    and locale < locale::date + ora + interval '2 hours'
    and inviata is distinct from locale::date;

select cron.schedule('linfa-promemoria', '* * * * *', $job$
  select net.http_post(
    url := 'https://fwwzqbelrfdstlsgtwrf.supabase.co/functions/v1/promemoria',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-linfa-cron', (select valore from privato.segreti where nome = 'cron')),
    body := '{"azione":"invia"}'::jsonb,
    timeout_milliseconds := 20000)
  where exists (select 1 from privato.da_inviare)
$job$);

select cron.schedule('linfa-pulizia', '40 3 * * *',
  $job$delete from cron.job_run_details where end_time < now() - interval '3 days'$job$);
