# Linfa

PWA per la cura del bonsai, con una notifica ogni sera verso le 19:17.

## Installazione (una volta sola)

1. Repository > Settings > Pages > Deploy from a branch > `main`, cartella `/ (root)`.
2. Su iPhone apri https://lauranappi.github.io/linfa/ in Safari > Condividi > Aggiungi alla schermata Home.
3. Apri l'app **dall'icona**, tocca "Attiva notifiche", consenti, poi "Copia".
4. Repository > Settings > Secrets and variables > Actions > New repository secret.
   Nome `PUSH_CONFIG`, valore il testo copiato. Non salvarlo in nessun file.
5. Actions > Notifiche Linfa > Run workflow. Deve arrivarti la notifica.

## Da sapere

- GitHub può far partire le pianificazioni in ritardo, a volte anche di parecchio.
- Orario: riga `cron` in `.github/workflows/notifiche.yml` (minuti e ora italiana).
- Frequenze: `tasks.js`.
- "Fatto" resta sul telefono e non ferma le notifiche.
- Se non arrivano più: guarda la scheda Actions. Se serve, "Ricollega notifiche" e aggiorna il secret.
