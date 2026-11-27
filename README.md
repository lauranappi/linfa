# Linfa

PWA per la cura del bonsai, con un promemoria ogni giorno all'ora che scegli.

## Installazione (una volta sola)

1. Repository > Settings > Pages > Deploy from a branch > `main`, cartella `/ (root)`.
2. Su iPhone apri https://lauranappi.github.io/linfa/ in Safari > Condividi > Aggiungi alla schermata Home.
3. Apri l'app **dall'icona**, tocca la campanella, accendi "Promemoria giornaliero", consenti e scegli l'orario.

## Cosa fa

- **Oggi**: i gesti del giorno, il periodo dell'anno, "Qualcosa non va?".
- **Diario**: annaffiature e foto.
- **Calendario** e **La pianta**: ritmo delle cure, stagioni, "Se parti", salvataggio online.
- Testi delle guide in `guide.js`.

## Da sapere

- Foto e diario stanno sul telefono; con "I tuoi dati" (La pianta) si salvano anche online.

- Frequenze: `tasks.js` (copialo anche in `supabase/functions/promemoria/` e ripubblica la funzione).
- "Fatto" resta sul telefono e non ferma le notifiche.
- Doppio tocco su "Oggi": ricarica l'app e prende la versione nuova.

## Salvataggio online

- All'avvio si vede la schermata di accesso (Accedi, Registrati, Password dimenticata), senza email di conferma.
- Funzione `dati` sullo stesso progetto Supabase: un solo account (email ammessa inserita a mano nel database);
  dopo la prima registrazione le iscrizioni risultano chiuse.
- Password salvata solo come hash; foto e diario in tabelle non esposte dall'API.
- Password dimenticata: svuota `privato.account` e `privato.sessioni`, poi registrati di nuovo dall'app.

## Notifiche

- Progetto Supabase `linfa` (piano gratuito): funzione `promemoria`, database in `supabase/migrations/`.
- Ogni minuto il database controlla chi ha raggiunto l'orario scelto e chiama la funzione.
- Sul server restano solo iscrizione del telefono, orario e fuso. Le chiavi private non sono nel repository.
- Un progetto gratuito poco usato per una settimana può essere messo in pausa: l'azione `Tieni sveglio Linfa`
  fa qualche richiesta al giorno per evitarlo. Se arriva l'email di avviso, apri il progetto su supabase.com.
- Se non arrivano più: controlla che il progetto sia attivo, poi spegni e riaccendi il promemoria.
