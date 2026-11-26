const webpush = require("web-push");
const { due } = require("../tasks.js");

if (!process.env.PUSH_CONFIG) { console.error("Manca il secret PUSH_CONFIG (vedi README)."); process.exit(1); }
let config;
try { config = JSON.parse(process.env.PUSH_CONFIG); }
catch (e) { console.error("PUSH_CONFIG non è valido: ricopialo per intero dall'app."); process.exit(1); }

const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
const tasks = due(day);
if (!tasks.length) process.exit(0);

webpush.sendNotification(
  config.subscription,
  JSON.stringify({ title: "Linfa", body: tasks.map(t => t.t).join(" · ") }),
  {
    TTL: 12 * 3600,
    vapidDetails: { subject: "https://github.com/" + process.env.GITHUB_REPOSITORY, publicKey: config.publicKey, privateKey: config.privateKey }
  }
).then(() => console.log("Notifica inviata."))
  .catch(e => {
    // Non stampare l'errore intero: contiene l'indirizzo privato del telefono.
    console.log("Invio fallito, codice " + e.statusCode + " " + (e.body || ""));
    // Iscrizione chiusa (promemoria spento dall'app, o scaduta): avvisa senza far fallire ogni sera.
    if (e.statusCode === 404 || e.statusCode === 410) console.log("::warning::Telefono non iscritto: accendi il promemoria nell'app e aggiorna il secret.");
    else process.exit(1);
  });
