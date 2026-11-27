-- Un telefono "collegato" è di chi ha fatto l'accesso: riceve promemoria secondo il suo diario.
alter table privato.iscrizioni add column collegata boolean not null default false;
