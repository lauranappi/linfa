let done = read("done") || {};
if (!isDay(read("dal"))) write("dal", today());

function when(date, day) {
  if (date.toISOString().slice(0, 10) === day) return "oggi";
  const far = date - new Date(day + "T12:00:00Z") > 300 * 864e5;
  const o = far ? { month: "short", year: "numeric" } : { day: "numeric", month: "short" };
  return date.toLocaleDateString("it-IT", { ...o, timeZone: "UTC" });
}
function item(k, sub, label) {
  const li = el("li"), node = el("div", "", "node"), icon = el("span"), info = el("div", "", "info"), text = el("div");
  icon.innerHTML = ICONS[k.icon];
  node.append(icon); text.append(el("strong", k.t), el("small", sub));
  info.append(text, el("span", label, "when")); li.append(node, info);
  return li;
}
window.clearSoil = () => { delete done.soil; write("done", done); };

function action(k, day, ok, from) {
  const soil = k.id === "soil", card = el("div", "", (ok ? "action done" : "action") + (soil && !ok ? " ask" : "")), text = el("div");
  const said = soil && Acqua.get(day) === "w" ? "Annaffiata oggi" : soil && Acqua.get(day) === "u" ? "Controllata: era umida" : "Fatto oggi";
  const late = !ok && from < day ? daysBetween(from, day) : 0;
  const sub = ok ? said : (late ? (late === 1 ? "Da ieri · " : "Da " + late + " giorni · ") : "") + k.short;
  text.append(el("strong", k.t), el("span", sub));
  card.append(text);
  const button = (label, aria, run) => { const b = el("button", label); b.type = "button"; b.setAttribute("aria-label", aria); b.onclick = run; return b; };
  const mark = r => () => { Acqua.set(day, r); done.soil = day; write("done", done); render(); if (r === "w") pour(); };
  if (soil && !ok) {
    const row = el("p");
    row.append(button("Ho bagnato", "Ho annaffiato la pianta", mark("w")), button("Era umida", "La terra era ancora umida", mark("u")));
    card.append(row);
  } else {
    card.append(button(ok ? "Annulla" : "Fatto", (ok ? "Annulla: " : "Fatto: ") + k.t, () => {
      if (soil) Acqua.set(day, null);
      if (ok) delete done[k.id]; else done[k.id] = day;
      write("done", done); Cure.log(k, day, !ok); render();
    }));
  }
  return card;
}
function render() {
  const day = today(), data = Cure.data(), { todo, fatti } = Bonsai.agenda(day, data);
  const together = Math.max(1, daysBetween(read("dal") || day, day) + 1);
  $("date").textContent = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }).replace(/^./, c => c.toUpperCase()) + " · insieme da " + (together === 1 ? "1 giorno" : together + " giorni");
  const open = todo.length;
  $("hello").textContent = !open ? "Per oggi è tutto." : open === 1 ? "Un gesto per lei." : open + " gesti per lei.";
  // La terra resta in cima, poi le altre cure nell'ordine del calendario.
  const cards = [...todo.map(x => ({ k: x.task, ok: false, from: x.from })), ...fatti.map(k => ({ k, ok: true }))]
    .sort((a, b) => (b.k.id === "soil") - (a.k.id === "soil"));
  $("today").replaceChildren(...cards.map(c => action(c.k, day, c.ok, c.from)));
  $("now-title").textContent = Guide.now().t; $("now-sub").textContent = Guide.now().short;
  const shown = new Set(cards.map(c => c.k.id));
  const upcoming = Bonsai.all(data).filter(k => !shown.has(k.id)).map(k => ({ k, n: Bonsai.next(k, data, day) })).sort((a, b) => a.n - b.n);
  $("soon").replaceChildren(...upcoming.slice(0, 2).map(x => item(x.k, x.k.short, when(x.n, day))));
  for (const group of ["often", "season"]) {
    const list = Bonsai.TASKS.filter(k => k.group === group)
      .map(k => ({ k, n: todo.some(x => x.task.id === k.id) ? noonOf(day) : Bonsai.next(k, data, day) })).sort((a, b) => a.n - b.n);
    $(group).replaceChildren(...list.map(x => item(x.k, x.k.every, when(x.n, day))));
  }
  Cure.mine(); Cure.banner();
}
// Pagine interne: nel menu resta accesa la scheda da cui partono.
const PARENT = { aiuto: "pianta", stagione: "pianta", parti: "pianta" };
function route() {
  const views = [...document.querySelectorAll("[data-view]")];
  const name = views.some(v => "#" + v.dataset.view === location.hash) ? location.hash.slice(1) : "oggi";
  views.forEach(v => v.hidden = v.dataset.view !== name);
  document.querySelectorAll("[data-nav]").forEach(a => a.dataset.nav === (PARENT[name] || name) ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
  if (name === "diario") Diario.show();
  if (name === "aiuto") Guide.help();
  if (name === "stagione") Guide.season();
  if (name === "parti") { Guide.away(); Cure.away(); }
  Cure.closeForms();
  document.querySelector("main").scrollTop = 0;
}
window.go = name => { history.replaceState(null, "", "#" + name); route(); };

// L'albero: sole o luna secondo l'ora, foglie che si muovono, gocce quando bagni.
const SVG = "http://www.w3.org/2000/svg";
const shape = (tag, attrs) => { const n = document.createElementNS(SVG, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
const tree = document.querySelector(".tree svg");
const crown = shape("g", { class: "crown" });
const leaves = [...tree.querySelectorAll('path[d^="M-10 0"]')];
tree.insertBefore(crown, leaves[0]); crown.append(...leaves);
const sky = shape("g", {}); tree.append(sky);
function paintSky() {
  const h = new Date().getHours(), light = h >= 7 && h < 18;
  sky.replaceChildren(...(light
    ? [shape("path", { d: "M244 20v6M244 50v6M226 38h6M256 38h6M231 25l4 4M253 47l4 4M257 25l-4 4M235 47l-4 4", stroke: "#F2B84B", "stroke-width": 2.5, "stroke-linecap": "round" })]
    : [shape("circle", { cx: 249, cy: 34, r: 8, fill: "#0F1622" })]));
}
function replay(node, cls) { node.classList.remove(cls); void node.getBoundingClientRect(); node.classList.add(cls); }
window.pour = () => {
  const rain = shape("g", { class: "rain", "aria-hidden": "true" });
  [118, 134, 150, 166, 182, 126, 158, 174].forEach((x, i) => {
    const d = shape("path", { d: `M${x} 130c0 0-5 7-5 10a5 5 0 0 0 10 0c0-3-5-10-5-10z`, fill: "#8FD3F4" });
    d.style.animationDelay = (i * 90) + "ms"; rain.append(d);
  });
  tree.querySelector(".rain")?.remove(); tree.append(rain); setTimeout(() => rain.remove(), 1900);
  replay(crown, "rustle");
};
$("tree").onclick = () => replay(crown, "rustle");

// Da quando è con te: resta sul telefono.
function fillAbout() { $("p-since").value = read("dal"); $("p-since").max = today(); }
$("p-since").onchange = () => { if (isDay($("p-since").value) && $("p-since").value <= today()) { write("dal", $("p-since").value); render(); } };
window.reloadData = () => { done = read("done") || {}; fillAbout(); render(); };

// Notifiche: il telefono si iscrive, il server (Supabase) manda il promemoria all'ora scelta.
const SERVER = "https://fwwzqbelrfdstlsgtwrf.supabase.co/functions/v1/promemoria";
const APIKEY = "sb_publishable_2tL_Nx-qeHqTcpSwhv8kOw_QQtEs0yu"; // chiavi pubbliche
const VAPID = "BM75WCiy4PRFxva74vvPrAQs1EgjCwYETyy0YNUCYzSNKylnCN3tLBUlUrV4QL5KFfwPzugiwLkGl0z2X-wTG2I";
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const bytes = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const ios = /iPhone|iPad/.test(navigator.userAgent);
const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});

const say = text => { $("msg").textContent = text; $("msg").hidden = !text; };
const ready = supported && !(ios && !standalone);
const oraScelta = () => /^\d\d:\d\d$/.test(read("ora")) ? read("ora") : "19:00";
let busy = false, giro = 0;

async function server(azione, dati) {
  const stop = new AbortController(), attesa = setTimeout(() => stop.abort(), 15000);
  try {
    const r = await fetch(SERVER, { method: "POST", signal: stop.signal, headers: { "Content-Type": "application/json", apikey: APIKEY }, body: JSON.stringify({ azione, ...dati }) })
      .catch(() => { throw new Error("Non riesco a collegarmi: controlla la connessione."); });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.errore || "Il server non risponde, riprova tra poco."), { status: r.status });
    return j;
  } finally { clearTimeout(attesa); }
}
const iscrizione = async () => (await navigator.serviceWorker.ready).pushManager.getSubscription();
async function salva(sub) {
  const { endpoint, keys } = sub.toJSON(), ora = oraScelta();
  const r = await server("salva", { endpoint, token: read("nuvola")?.token, p256dh: keys.p256dh, auth: keys.auth, ora, fuso: Intl.DateTimeFormat().resolvedOptions().timeZone });
  write("promemoria", { endpoint });
  return "Il prossimo arriva " + r.prossima + " alle " + ora + ".";
}
// Resti del vecchio sistema con il codice da copiare.
function pulisci() {
  try { localStorage.removeItem("linfa:config"); localStorage.removeItem("linfa:ok"); } catch (e) {}
  window.caches?.delete("linfa-state").catch(() => {});
}
function paint(on) { $("daily").checked = on; $("try").disabled = !on; }
function spento(text) { write("promemoria", null); paint(false); say(text); }
// L'interruttore mostra lo stato vero: acceso solo se telefono e server sono d'accordo.
async function refresh() {
  if (!ready || busy) return;
  const mio = ++giro, vecchio = () => busy || mio !== giro;
  try {
    const sub = await iscrizione(), saved = read("promemoria");
    if (vecchio()) return;
    if (!saved || !sub || Notification.permission !== "granted") {
      paint(false);
      if (read("config")) say("Ora il promemoria funziona senza codice: riaccendilo.");
      return;
    }
    paint(true);
    if (sub.endpoint !== saved.endpoint) { await salva(sub); return; }
    const stato = await server("stato", { endpoint: sub.endpoint, token: read("nuvola")?.token });
    if (vecchio()) return;
    if (!stato.attivo) return spento("Il promemoria si è spento: riaccendilo.");
    write("ora", stato.ora); $("ora").value = stato.ora;
  } catch (e) { /* senza rete resta quello che c'è */ }
}
async function turnOn() {
  // La richiesta di permesso deve partire direttamente dal tocco.
  if (await Notification.requestPermission() !== "granted") throw new Error("Le notifiche sono bloccate: abilitale in Impostazioni > Notifiche.");
  await navigator.serviceWorker.register("sw.js");
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (sub) {
    const k = sub.options?.applicationServerKey;
    // Un'iscrizione fatta con un'altra chiave va rifatta.
    if (k ? b64(k) !== VAPID : read("promemoria")?.endpoint !== sub.endpoint) { await sub.unsubscribe(); sub = null; }
  }
  sub = sub || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes(VAPID) });
  const quando = await salva(sub);
  pulisci(); paint(true); say("Fatto. " + quando);
}
async function turnOff() {
  const sub = await iscrizione();
  if (sub) {
    // Se il server non risponde, cancellerà il telefono al primo invio rifiutato.
    await server("togli", { endpoint: sub.endpoint }).catch(() => {});
    await sub.unsubscribe();
  }
  pulisci(); spento("Promemoria spento.");
}
async function lavora(fai, annulla) {
  busy = true; giro++; $("daily").disabled = $("ora").disabled = true; say("");
  try { await fai(); }
  catch (e) { annulla?.(); say(e.name === "Error" ? e.message : "Qualcosa è andato storto, riprova."); }
  finally { busy = false; $("daily").disabled = $("ora").disabled = false; }
}

$("ora").value = oraScelta();
if (!ready) {
  say("Questo dispositivo non supporta le notifiche. Su iPhone installa prima l'app dalla schermata Home.");
} else {
  $("daily").disabled = false;
  refresh();
}
$("daily").onchange = () => {
  const wanted = $("daily").checked;
  lavora(wanted ? turnOn : turnOff, () => paint(!wanted));
};
// La rotella dell'orario cambia più volte di fila: si salva quando si ferma.
let attesaOra;
$("ora").onchange = () => {
  clearTimeout(attesaOra);
  const valore = $("ora").value;
  if (!valore) { $("ora").value = oraScelta(); return; }
  attesaOra = setTimeout(() => {
    const prima = oraScelta();
    write("ora", valore);
    if (!$("daily").checked) return;
    lavora(async () => say(await salva(await iscrizione())), () => { write("ora", prima); $("ora").value = prima; });
  }, 900);
};
$("try").onclick = async () => {
  $("try").disabled = true; say("Invio la prova…");
  try {
    await server("prova", { endpoint: (await iscrizione()).endpoint });
    say("Inviata: dovrebbe arrivare tra pochi secondi.");
  } catch (e) {
    if (e.status === 404 || e.status === 410) return spento(e.message);
    say(e.name === "Error" ? e.message : "Prova non riuscita, riprova.");
  }
  $("try").disabled = !$("daily").checked;
};
fillAbout();
paintSky();
render();
route();
addEventListener("hashchange", route);
// Le voci del menu cambiano vista senza navigare.
document.addEventListener("click", e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  e.preventDefault();
  history.replaceState(null, "", a.getAttribute("href"));
  route();
  if (a.dataset.nav === "oggi") doppioTocco(a);
});

// Doppio tocco su Oggi (entro 0,6 secondi): rotellina, poi ricarica per prendere la versione nuova.
let ultimoTocco = 0, aggiorno = false;
function doppioTocco(a) {
  const adesso = Date.now(), doppio = adesso - ultimoTocco < 600;
  ultimoTocco = doppio ? 0 : adesso;
  if (!doppio || aggiorno) return;
  aggiorno = true;
  a.querySelector("svg").outerHTML = '<svg class="gira" width="20" height="20" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Aggiorno"><path d="M12.5 7A5.5 5.5 0 1 1 9.9 2.3"/><path d="M12.5 2.5v3.2H9.3"/></svg>';
  setTimeout(aggiornaApp, 480);
}
async function aggiornaApp() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await Promise.race([reg.update(), new Promise(r => setTimeout(r, 2500))]);
  } catch (e) { /* senza service worker basta ricaricare */ }
  location.reload();
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) { render(); refresh(); paintSky(); if (location.hash === "#diario") Diario.show(); } });
