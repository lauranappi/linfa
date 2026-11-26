# Linfa

PWA per la cura del bonsai, con una notifica ogni sera verso le 19:17.

## Installazione (una volta sola)

1. Repository > Settings > Pages > Deploy from a branch > `main`, cartella `/ (root)`.
2. Su iPhone apri https://lauranappi.github.io/linfa/ in Safari > Condividi > Aggiungi alla schermata Home.
3. Apri l'app **dall'icona**, tocca la campanella, accendi "Promemoria giornaliero", consenti, poi "Copia il codice".
4. Repository > Settings > Secrets and variables > Actions > New repository secret.
   Nome `PUSH_CONFIG`, valore il testo copiato. Non salvarlo in nessun file.
5. Actions > Notifiche Linfa > Run workflow. Deve arrivarti la notifica.

## Da sapere

- GitHub può far partire le pianificazioni in ritardo, a volte anche di parecchio.
- Orario: riga `cron` in `.github/workflows/notifiche.yml` (minuti e ora italiana).
- Frequenze: `tasks.js`.
- "Fatto" resta sul telefono e non ferma le notifiche.
- Doppio tocco su "Oggi": ricarica l'app e prende la versione nuova.
- Se spegni il promemoria e lo riaccendi, il codice cambia: aggiorna il secret.
- Se non arrivano più: guarda la scheda Actions e l'interruttore nell'app. Se serve, riaccendilo o tocca "Mostra di nuovo il codice", poi aggiorna il secret.
