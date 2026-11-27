// Promemoria di Linfa: salva l'iscrizione del telefono e manda la notifica all'ora scelta.
// "invia" lo chiama solo il database (pg_cron), con un segreto che non esce da lì.
import webpush from "npm:web-push@3.6.7";
import postgres from "npm:postgres@3.4.5";
import "./tasks.js"; // copia di /tasks.js: se lo cambi, ripubblica la funzione.

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 1 });
const APIKEY = "sb_publishable_2tL_Nx-qeHqTcpSwhv8kOw_QQtEs0yu"; // pubblica, la stessa dell'app
const SUBJECT = "https://github.com/lauranappi/linfa";
const HOSTS = /^(web\.push\.apple\.com|fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.notify\.windows\.com)$/;
const CORS = {
  "Access-Control-Allow-Origin": "https://lauranappi.github.io",
  "Access-Control-Allow-Headers": "content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: CORS });
const fail = (errore: string, status = 400) => reply({ errore }, status);

type Sub = { endpoint: string; p256dh: string; auth: string };

// Le chiavi delle notifiche nascono qui la prima volta e la privata resta nel database.
async function keys() {
  const find = () => sql`select valore from privato.segreti where nome = 'vapid'`;
  let [r] = await find();
  if (!r) {
    await sql`insert into privato.segreti (nome, valore) values ('vapid', ${JSON.stringify(webpush.generateVAPIDKeys())}) on conflict (nome) do nothing`;
    [r] = await find();
  }
  return JSON.parse(r.valore);
}

async function push(s: Sub, body: string) {
  const k = await keys();
  await webpush.sendNotification(
    { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
    JSON.stringify({ title: "Linfa", body }),
    { TTL: 12 * 3600, timeout: 10000, vapidDetails: { subject: SUBJECT, publicKey: k.publicKey, privateKey: k.privateKey } },
  );
}
const gone = (e: any) => e?.statusCode === 404 || e?.statusCode === 410;
const remove = (endpoint: string) => sql`delete from privato.iscrizioni where endpoint = ${endpoint}`;

function validEndpoint(v: unknown): v is string {
  if (typeof v !== "string" || v.length > 1000) return false;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && !u.port && !u.username && HOSTS.test(u.hostname);
  } catch { return false; }
}

async function send() {
  // Prima segna come inviato, così due giri insieme non mandano doppioni.
  const rows = await sql`
    update privato.iscrizioni i set inviata = d.giorno from privato.da_inviare d
    where i.endpoint = d.endpoint and i.inviata is distinct from d.giorno
    returning i.endpoint, i.p256dh, i.auth, to_char(d.giorno, 'YYYY-MM-DD') as giorno`;
  let inviate = 0;
  await Promise.all(rows.map(async (r: any) => {
    const body = (globalThis as any).Bonsai.due(r.giorno).map((t: any) => t.t).join(" · ");
    if (!body) return;
    try { await push(r, body); inviate++; }
    catch (e: any) {
      console.log("Invio fallito, codice", e?.statusCode ?? "rete");
      if (gone(e)) await remove(r.endpoint);
      // Errore passeggero: si riprova al minuto successivo, entro due ore.
      else if (!e?.statusCode || e.statusCode === 429 || e.statusCode >= 500) {
        await sql`update privato.iscrizioni set inviata = null where endpoint = ${r.endpoint}`;
      }
    }
  }));
  return reply({ trovate: rows.length, inviate });
}

async function handle(req: Request) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return fail("Richiesta non valida.", 405);
  const text = await req.text();
  let d: any;
  try { if (text.length > 4000) throw 0; d = JSON.parse(text); if (!d || typeof d !== "object") throw 0; }
  catch { return fail("Richiesta non valida."); }

  if (d.azione === "invia") {
    const [s] = await sql`select valore from privato.segreti where nome = 'cron'`;
    return req.headers.get("x-linfa-cron") === s.valore ? send() : fail("Non autorizzato.", 401);
  }
  if (req.headers.get("apikey") !== APIKEY) return fail("Non autorizzato.", 401);
  if (d.azione === "ping") {
    await keys();
    const [r] = await sql`select count(*)::int as n from privato.iscrizioni`;
    return reply({ ok: true, iscritti: r.n > 0 });
  }
  if (!validEndpoint(d.endpoint)) return fail("Telefono non riconosciuto.");

  if (d.azione === "salva") {
    if (!/^[A-Za-z0-9_-]{80,100}={0,2}$/.test(d.p256dh) || !/^[A-Za-z0-9_-]{16,32}={0,2}$/.test(d.auth)) return fail("Iscrizione non valida.");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.ora)) return fail("Orario non valido.");
    const [zone] = await sql`select 1 from pg_timezone_names where name = ${String(d.fuso)}`;
    if (!zone) return fail("Fuso orario non riconosciuto.");
    // L'app è personale: un tetto evita che il database si riempia.
    const [c] = await sql`select count(*)::int as n from privato.iscrizioni where endpoint <> ${d.endpoint}`;
    if (c.n >= 20) return fail("Troppi telefoni iscritti.", 429);
    // Se l'ora di oggi è già passata, si parte da domani.
    const [r] = await sql`
      with t as (select now() at time zone ${d.fuso}::text as locale)
      insert into privato.iscrizioni (endpoint, p256dh, auth, ora, fuso, inviata)
      select ${d.endpoint}, ${d.p256dh}, ${d.auth}, ${d.ora}::text::time, ${d.fuso}::text,
        case when locale::time >= ${d.ora}::text::time then locale::date end from t
      on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth,
        ora = excluded.ora, fuso = excluded.fuso, inviata = excluded.inviata
      returning inviata is null as oggi`;
    return reply({ prossima: r.oggi ? "oggi" : "domani" });
  }
  if (d.azione === "stato") {
    const [r] = await sql`select to_char(ora, 'HH24:MI') as ora from privato.iscrizioni where endpoint = ${d.endpoint}`;
    return reply(r ? { attivo: true, ora: r.ora } : { attivo: false });
  }
  if (d.azione === "togli") {
    await remove(d.endpoint);
    return reply({ ok: true });
  }
  if (d.azione === "prova") {
    const [r] = await sql`
      update privato.iscrizioni set ultima_prova = now()
      where endpoint = ${d.endpoint} and (ultima_prova is null or ultima_prova < now() - interval '20 seconds')
      returning endpoint, p256dh, auth`;
    if (!r) {
      const [there] = await sql`select 1 from privato.iscrizioni where endpoint = ${d.endpoint}`;
      return there ? fail("Aspetta qualche secondo e riprova.", 429) : fail("Il promemoria è spento: riaccendilo.", 404);
    }
    try { await push(r as unknown as Sub, "Le notifiche funzionano. Ti ricorderò come curare la pianta."); }
    catch (e: any) {
      console.log("Prova fallita, codice", e?.statusCode ?? "rete");
      if (gone(e)) { await remove(d.endpoint); return fail("Il promemoria si è spento: riaccendilo.", 410); }
      return fail("Il telefono non ha accettato la prova, riprova tra poco.", 502);
    }
    return reply({ ok: true });
  }
  return fail("Richiesta non valida.");
}

Deno.serve((req) => handle(req).catch((e) => {
  console.log("Errore:", e?.message);
  return fail("Il server non risponde, riprova tra poco.", 500);
}));
