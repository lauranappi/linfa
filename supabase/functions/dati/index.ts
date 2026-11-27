// Salvataggio online di Linfa: un solo account, diario e foto in tabelle non esposte.
import postgres from "npm:postgres@3.4.5";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 1 });
const APIKEY = "sb_publishable_2tL_Nx-qeHqTcpSwhv8kOw_QQtEs0yu"; // pubblica, la stessa dell'app
const SPAZIO = 400 * 1024 * 1024;
const CORS = {
  "Access-Control-Allow-Origin": "https://lauranappi.github.io",
  "Access-Control-Allow-Headers": "content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: CORS });
const fail = (errore: string, status = 400) => reply({ errore }, status);

const isDay = (s: unknown): s is string =>
  typeof s === "string" && /^20\d\d-\d\d-\d\d$/.test(s) &&
  !isNaN(Date.parse(s + "T12:00:00Z")) && new Date(s + "T12:00:00Z").toISOString().startsWith(s);
const isId = (s: unknown): s is string => typeof s === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(s);

// Tiene solo i campi che l'app usa, nella forma attesa. Deve accettare tutto ciò che l'app scrive.
function clean(d: any) {
  const map = (o: any, ok: (k: string, v: any) => boolean) =>
    Object.fromEntries(Object.entries(o && typeof o === "object" ? o : {}).filter(([k, v]) => ok(k, v)));
  const text = (s: unknown, max: number): s is string => typeof s === "string" && s.length <= max;
  const kind = (s: unknown): s is string => typeof s === "string" && /^[a-z]{1,20}$/.test(s);
  const out: Record<string, unknown> = {
    water: map(d?.water, (k, v) => isDay(k) && (v === "w" || v === "u")),
    done: map(d?.done, (k, v) => kind(k) && isDay(v)),
    dal: isDay(d?.dal) ? d.dal : null,
  };
  // Se un'app non aggiornata non li manda, quelli salvati restano.
  if (d?.cure) out.cure = map(d.cure, (k, v) => /^[a-z0-9-]{1,40}$/.test(k) && !!v && isDay(v.d) && kind(v.k) && text(v.t, 60) && text(v.n, 200));
  if (d?.mie) out.mie = map(d.mie, (k, v) => kind(k) && !!v && text(v.t, 40) && v.t.length > 0 && Number.isInteger(v.n) && v.n >= 1 && v.n <= 365 && ["g", "s", "m"].includes(v.u) && isDay(v.dal));
  if (d?.via) out.via = map(d.via, (k, v) => (k === "da" || k === "a") && isDay(v));
  return out;
}

async function enter(d: any, nuovo: boolean) {
  const email = String(d.email ?? "").trim().toLowerCase(), password = String(d.password ?? "");
  if (!email || email.length > 200) return fail("Scrivi la tua email.");
  if (password.length < 8 || new TextEncoder().encode(password).length > 72) return fail("La password deve avere da 8 a 72 caratteri.");
  return await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(7421)`; // un tentativo alla volta
    const [t] = await tx`select count(*)::int as n from privato.tentativi where quando > now() - interval '15 minutes'`;
    if (t.n >= 10) return fail("Troppi tentativi: riprova tra un quarto d'ora.", 429);
    const wrong = async (msg: string) => { await tx`insert into privato.tentativi default values`; return fail(msg, 403); };
    const [acc] = await tx`select email, hash = extensions.crypt(${password}::text, hash) as ok from privato.account`;
    if (nuovo) {
      // Un solo account, e solo per l'email ammessa.
      if (acc) return fail("Le iscrizioni sono chiuse.", 403);
      const [allowed] = await tx`select 1 from privato.ammesso where email = ${email}`;
      if (!allowed) return await wrong("Le iscrizioni sono chiuse per questa email.");
      await tx`insert into privato.account (email, hash) values (${email}, extensions.crypt(${password}::text, extensions.gen_salt('bf', 10)))`;
    } else if (!acc || acc.email !== email || !acc.ok) return await wrong("Email o password non corrette.");
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");
    await tx`delete from privato.tentativi`;
    await tx`insert into privato.sessioni (token_hash) values (encode(extensions.digest(${token}::text, 'sha256'), 'hex'))`;
    await tx`delete from privato.sessioni where token_hash not in (select token_hash from privato.sessioni order by creata desc limit 10)`;
    return reply({ token, email });
  });
}

async function handle(req: Request) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return fail("Richiesta non valida.", 405);
  if (req.headers.get("apikey") !== APIKEY) return fail("Non autorizzato.", 401);
  if (Number(req.headers.get("content-length") ?? 0) > 3_000_000) return fail("Foto troppo grande.", 413);
  const text = await req.text();
  let d: any;
  try { if (text.length > 3_000_000) throw 0; d = JSON.parse(text); if (!d || typeof d !== "object") throw 0; }
  catch { return fail("Richiesta non valida."); }

  if (d.azione === "registrazioni") {
    const [r] = await sql`select count(*)::int as n from privato.account`;
    return reply({ aperte: r.n === 0 });
  }
  if (d.azione === "entra" || d.azione === "registrati") return await enter(d, d.azione === "registrati");

  const token = String(d.token ?? "");
  const [session] = await sql`select token_hash from privato.sessioni where token_hash = encode(extensions.digest(${token}::text, 'sha256'), 'hex')`;
  if (!session) return fail("Accesso scaduto: entra di nuovo.", 401);

  if (d.azione === "esci") {
    await sql`delete from privato.sessioni where token_hash = ${session.token_hash}`;
    return reply({ ok: true });
  }
  if (d.azione === "stato") {
    const [r] = await sql`select versione, dati from privato.diario`;
    const foto = await sql`select id, to_char(giorno, 'YYYY-MM-DD') as day, nota as note, tolta from privato.foto order by id`;
    return reply({ versione: r.versione, dati: r.dati, foto });
  }
  if (d.azione === "salva") {
    if (!Number.isInteger(d.base)) return fail("Richiesta non valida.");
    const body = JSON.stringify(clean(d.dati));
    if (body.length > 300_000) return fail("Diario troppo grande.", 413);
    const [r] = await sql`update privato.diario set dati = dati || ${body}::text::jsonb, versione = versione + 1, aggiornato = now()
      where versione = ${d.base} returning versione`;
    return r ? reply({ versione: r.versione }) : fail("Il diario è cambiato nel frattempo.", 409);
  }
  if (!isId(d.id)) return fail("Foto non riconosciuta.");
  if (d.azione === "carica") {
    const img = d.img;
    if (!isDay(d.day) || typeof img !== "string" || !img.startsWith("/9j/") || img.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(img)) return fail("Foto non valida.");
    const [s] = await sql`select coalesce(sum(octet_length(img)), 0)::float8 as n from privato.foto`;
    if (s.n + img.length * 0.75 > SPAZIO) return fail("Spazio online pieno.", 507);
    await sql`insert into privato.foto (id, giorno, nota, img)
      values (${d.id}, ${d.day}::text::date, ${String(d.note ?? "").slice(0, 200)}, decode(${img}::text, 'base64'))
      on conflict (id) do nothing`;
    const [r] = await sql`select tolta from privato.foto where id = ${d.id}`;
    return reply({ tolta: r.tolta });
  }
  if (d.azione === "scarica") {
    const [r] = await sql`select replace(encode(img, 'base64'), chr(10), '') as img from privato.foto where id = ${d.id} and not tolta`;
    return r ? reply({ img: r.img }) : fail("Foto non trovata.", 404);
  }
  if (d.azione === "togli") {
    // Resta il segno che è stata tolta, così non ritorna da un altro telefono.
    await sql`insert into privato.foto (id, giorno, tolta) values (${d.id}, current_date, true)
      on conflict (id) do update set img = null, nota = '', tolta = true`;
    return reply({ ok: true });
  }
  return fail("Richiesta non valida.");
}

Deno.serve((req) => handle(req).catch((e) => {
  console.log("Errore:", e?.message);
  return fail("Il server non risponde, riprova tra poco.", 500);
}));
